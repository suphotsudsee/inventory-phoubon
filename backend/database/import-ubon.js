/**
 * Import opening stock quantities from data-ubon.xlsx.
 *
 * Expected worksheet layout:
 * - row 1: labels
 * - data starts from row 3 in the exported sheet structure
 * - GPUID at __EMPTY_2
 * - DRUG NAME at __EMPTY_3
 * - UNIT at __EMPTY_4
 * - quantity at __EMPTY_5
 * - hosp code at __EMPTY_7
 * - report date at __EMPTY_8
 *
 * Usage:
 *   node database/import-ubon.js "C:\\path\\to\\data-ubon.xlsx"
 */

const path = require('path');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_SHEET_NAME = 'data-ubon';
const BATCH_SIZE = 500;

function cleanString(value) {
  return String(value ?? '').trim();
}

function toSafeInt(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function excelDateToJsDate(value) {
  if (!Number.isFinite(Number(value))) return null;
  const parsed = XLSX.SSF.parse_date_code(Number(value));
  if (!parsed) return null;
  const normalizedYear = parsed.y > 2400 ? parsed.y - 543 : parsed.y;
  const yyyy = String(normalizedYear).padStart(4, '0');
  const mm = String(parsed.m).padStart(2, '0');
  const dd = String(parsed.d).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} 00:00:00`;
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

function readWorkbook(excelPath) {
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

function normalizeRows(rows) {
  const aggregated = new Map();

  for (const row of rows) {
    const productCode = cleanString(row.__EMPTY_2);
    const hospCode = cleanString(row.__EMPTY_7);
    if (!productCode || productCode === 'GPUID' || !hospCode) continue;

    const quantity = toSafeInt(row.__EMPTY_5);
    const aggregateKey = `${productCode}|${hospCode}`;
    const current = aggregated.get(aggregateKey) || {
      productCode,
      hospCode,
      productName: cleanString(row.__EMPTY_3),
      unit: cleanString(row.__EMPTY_4),
      quantity: 0,
      reportDate: excelDateToJsDate(row.__EMPTY_8),
    };

    current.quantity += quantity;
    if (!current.productName) {
      current.productName = cleanString(row.__EMPTY_3);
    }
    if (!current.unit) {
      current.unit = cleanString(row.__EMPTY_4);
    }
    aggregated.set(aggregateKey, current);
  }

  return Array.from(aggregated.values()).map((item) => ({
    ...item,
    supplier: item.hospCode,
  }));
}

async function importOpeningStock(connection, normalizedRows) {
  const productCodes = normalizedRows.map((row) => row.productCode);
  const productMap = new Map();

  for (const codeChunk of chunkArray(productCodes, BATCH_SIZE)) {
    const [rows] = await connection.query(
      'SELECT id, product_code FROM products WHERE product_code IN (?)',
      [codeChunk]
    );
    for (const row of rows) {
      productMap.set(String(row.product_code), row.id);
    }
  }

  const matchedRows = normalizedRows.filter((row) => productMap.has(row.productCode));
  const missingRows = normalizedRows.filter((row) => !productMap.has(row.productCode));

  const quantityByProduct = new Map();
  for (const row of matchedRows) {
    quantityByProduct.set(
      row.productCode,
      (quantityByProduct.get(row.productCode) || 0) + row.quantity
    );
  }

  await connection.execute(
    "DELETE FROM stock_lots WHERE lot_number LIKE 'OPENING-UBON%'"
  );

  const stockLevelRows = Array.from(quantityByProduct.entries()).map(([productCode, quantity]) => ({
    productId: productMap.get(productCode),
    quantity,
  }));

  for (const rowChunk of chunkArray(stockLevelRows, BATCH_SIZE)) {
    await connection.query(
      `INSERT INTO stock_levels (product_id, quantity, min_level, reorder_point, last_counted_at)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         quantity = VALUES(quantity),
         last_counted_at = VALUES(last_counted_at),
         updated_at = CURRENT_TIMESTAMP`,
      [rowChunk.map((row) => [
        row.productId,
        row.quantity,
        0,
        0,
        new Date(),
      ])]
    );
  }

  for (const row of matchedRows) {
    const productId = productMap.get(row.productCode);
    const lotNumber = `OPENING-UBON-${row.hospCode}`;
    await connection.execute(
      `INSERT INTO stock_lots
       (product_id, lot_number, quantity, original_quantity, supplier, received_date, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      [productId, lotNumber, row.quantity, row.quantity, row.supplier, row.reportDate || new Date()]
    );
  }

  return {
    matchedProducts: new Set(matchedRows.map((row) => row.productCode)).size,
    matchedHospcodeLots: matchedRows.length,
    missingProducts: missingRows.length,
    totalQuantity: matchedRows.reduce((sum, row) => sum + row.quantity, 0),
    missingSample: missingRows.slice(0, 20).map((row) => ({
      productCode: row.productCode,
      productName: row.productName,
      quantity: row.quantity,
    })),
  };
}

async function run() {
  const excelPath = process.argv[2];
  if (!excelPath) {
    throw new Error('Excel path is required');
  }

  const resolvedPath = path.resolve(excelPath);
  const { sheetName, rows } = readWorkbook(resolvedPath);
  const normalizedRows = normalizeRows(rows);
  const connection = await getConnection();

  try {
    console.log(`Importing file: ${resolvedPath}`);
    console.log(`Worksheet: ${sheetName}`);
    console.log(`Rows found: ${rows.length}`);
    console.log(`Unique GPUID rows: ${normalizedRows.length}`);

    const result = await importOpeningStock(connection, normalizedRows);
    const [stockLevelCountRows] = await connection.query('SELECT COUNT(*) AS count FROM stock_levels');
    const [stockLotCountRows] = await connection.query('SELECT COUNT(*) AS count FROM stock_lots');

    console.log('Import completed');
    console.log(JSON.stringify({
      ...result,
      totalStockLevels: stockLevelCountRows[0].count,
      totalStockLots: stockLotCountRows[0].count,
    }, null, 2));
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('Import failed:', error.message);
  process.exit(1);
});
