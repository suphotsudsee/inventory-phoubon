/**
 * Import opening stock items from a table-10 Excel file.
 *
 * Expected columns:
 * - GPUID
 * - DrugName
 * - DispUnit
 * - Groups
 * - WachtList (optional, numeric values only will be used as min stock)
 *
 * This importer creates:
 * - categories
 * - products
 * - stock_levels
 *
 * If the source file does not contain quantity columns, products are imported
 * with opening quantity = 0.
 *
 * Usage:
 *   node database/import-table10.js "C:\\path\\to\\table-10.xlsx"
 */

const path = require('path');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_SHEET_NAME = 'table-10';
const BATCH_SIZE = 500;

function pickNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function fitString(value, maxLength) {
  const text = cleanString(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inventory_phoubon',
    charset: 'utf8mb4',
  });
}

function readTable10(excelPath) {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames.includes(DEFAULT_SHEET_NAME)
    ? DEFAULT_SHEET_NAME
    : workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('No worksheet found in Excel file');
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  return { sheetName, rows };
}

async function ensureCategories(connection, rows) {
  const categoryNames = new Set();

  for (const row of rows) {
    const name = fitString(row.Groups || row.groups || row.GROUPS || row.Group, 100);
    if (name) {
      categoryNames.add(name);
    }
  }

  categoryNames.add('Uncategorized');

  const existingRows = await connection.query(
    'SELECT id, category_name FROM categories WHERE category_name IN (?)',
    [[...categoryNames]]
  );
  const categoryMap = new Map(existingRows[0].map((row) => [row.category_name, row.id]));

  for (const categoryName of categoryNames) {
    if (categoryMap.has(categoryName)) {
      continue;
    }

    const [result] = await connection.execute(
      'INSERT INTO categories (category_name, is_active) VALUES (?, 1)',
      [categoryName]
    );
    categoryMap.set(categoryName, result.insertId);
  }

  return categoryMap;
}

async function importRows(connection, rows, categoryMap) {
  const preparedRows = [];
  let skippedRows = 0;

  for (const row of rows) {
    const productCode = fitString(row.GPUID || row.gpuid || row.GpuID, 50);
    const productName = fitString(
      row.DrugName || row.drugName || row.drug_name || row.DRUGNAME || row['DRUG NAME'],
      255
    );
    const unit = fitString(row.DispUnit || row.dispUnit || row.UNIT || row.Unit || row.unit, 50);
    const categoryName = fitString(row.Groups || row.groups || row.GROUPS || row.Group, 100) || 'Uncategorized';
    const minStockLevel = pickNumber(
      row.min_stock || row.minStock || row.WatchList || row.WachtList || 0,
      0
    );

    if (!productCode || !productName) {
      skippedRows++;
      continue;
    }

    const categoryId = categoryMap.get(categoryName) || null;
    preparedRows.push({
      productCode,
      productName,
      categoryId,
      unit: unit || null,
      minStockLevel,
    });
  }

  const uniqueRows = Array.from(
    new Map(preparedRows.map((row) => [row.productCode, row])).values()
  );

  const productCodes = uniqueRows.map((row) => row.productCode);
  const existingCodeSet = new Set();
  for (const codeChunk of chunkArray(productCodes, BATCH_SIZE)) {
    const [existingRows] = await connection.query(
      'SELECT product_code FROM products WHERE product_code IN (?)',
      [codeChunk]
    );
    for (const row of existingRows) {
      existingCodeSet.add(row.product_code);
    }
  }

  for (const rowChunk of chunkArray(uniqueRows, BATCH_SIZE)) {
    await connection.query(
      `INSERT INTO products (product_code, product_name, category_id, unit_sell, min_stock_level, is_active)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         product_name = VALUES(product_name),
         category_id = VALUES(category_id),
         unit_sell = VALUES(unit_sell),
         min_stock_level = VALUES(min_stock_level),
         is_active = VALUES(is_active),
         updated_at = CURRENT_TIMESTAMP`,
      [rowChunk.map((row) => [
        row.productCode,
        row.productName,
        row.categoryId,
        row.unit,
        row.minStockLevel,
        1,
      ])]
    );
  }

  const productIdMap = new Map();
  for (const codeChunk of chunkArray(productCodes, BATCH_SIZE)) {
    const [productRows] = await connection.query(
      'SELECT id, product_code FROM products WHERE product_code IN (?)',
      [codeChunk]
    );
    for (const row of productRows) {
      productIdMap.set(row.product_code, row.id);
    }
  }

  for (const rowChunk of chunkArray(uniqueRows, BATCH_SIZE)) {
    await connection.query(
      `INSERT INTO stock_levels (product_id, quantity, min_level, reorder_point, last_counted_at)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         min_level = VALUES(min_level),
         reorder_point = VALUES(reorder_point),
         updated_at = CURRENT_TIMESTAMP`,
      [rowChunk
        .map((row) => {
          const productId = productIdMap.get(row.productCode);
          if (!productId) {
            return null;
          }
          return [productId, 0, row.minStockLevel, row.minStockLevel, new Date()];
        })
        .filter(Boolean)]
    );
  }

  const insertedProducts = uniqueRows.filter((row) => !existingCodeSet.has(row.productCode)).length;
  const updatedProducts = uniqueRows.length - insertedProducts;

  return { insertedProducts, updatedProducts, skippedRows };
}

async function run() {
  const excelPath = process.argv[2];

  if (!excelPath) {
    throw new Error('Excel path is required');
  }

  const resolvedPath = path.resolve(excelPath);
  const { sheetName, rows } = readTable10(resolvedPath);
  const connection = await getConnection();

  try {
    console.log(`Importing file: ${resolvedPath}`);
    console.log(`Worksheet: ${sheetName}`);
    console.log(`Rows found: ${rows.length}`);

    const categoryMap = await ensureCategories(connection, rows);
    const result = await importRows(connection, rows, categoryMap);

    const [productCountRows] = await connection.query('SELECT COUNT(*) AS count FROM products');
    const [stockLevelCountRows] = await connection.query('SELECT COUNT(*) AS count FROM stock_levels');

    console.log('Import completed');
    console.log(JSON.stringify({
      categories: categoryMap.size,
      ...result,
      totalProducts: productCountRows[0].count,
      totalStockLevels: stockLevelCountRows[0].count,
      openingQuantityRule: 0,
    }, null, 2));
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('Import failed:', error.message);
  process.exit(1);
});
