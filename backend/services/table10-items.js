const XLSX = require('xlsx');
const { query } = require('../db/pool');

const DEFAULT_SHEET_NAME = 'table-10';
const BATCH_SIZE = 500;

async function ensureTable10ItemsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS table10_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      gpuid VARCHAR(50) NOT NULL,
      drug_name VARCHAR(255) NOT NULL,
      disp_unit VARCHAR(50) NULL,
      drug_group VARCHAR(255) NULL,
      service_plan VARCHAR(255) NULL,
      wacht_list VARCHAR(100) NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_table10_items_gpuid (gpuid),
      INDEX idx_table10_items_name (drug_name),
      INDEX idx_table10_items_group (drug_group),
      INDEX idx_table10_items_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function cleanString(value, maxLength) {
  const text = String(value ?? '').trim();
  if (!maxLength) {
    return text;
  }
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function pickNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function normalizeTable10Row(row) {
  return {
    gpuid: cleanString(row.GPUID || row.gpuid || row.GpuID, 50),
    drugName: cleanString(
      row.DrugName || row.drugName || row.drug_name || row.DRUGNAME || row['DRUG NAME'],
      255
    ),
    dispUnit: cleanString(row.DispUnit || row.dispUnit || row.UNIT || row.Unit || row.unit, 50),
    groupName: cleanString(row.Groups || row.groups || row.GROUPS || row.Group, 255),
    servicePlan: cleanString(row.Service_plan || row.service_plan || row.ServicePlan, 255),
    wachtList: cleanString(row.WachtList || row.WatchList || row.wacht_list, 100),
    openingQuantity: pickNumber(
      row.Quantity || row.quantity || row.Qty || row.qty || row.Balance || row.balance || row.Stock || row.stock,
      0
    ),
  };
}

function buildInClause(values) {
  return values.map(() => '?').join(', ');
}

function mapTable10Item(row) {
  return {
    id: String(row.id),
    gpuid: row.gpuid,
    drugName: row.drug_name,
    dispUnit: row.disp_unit || '',
    groupName: row.drug_group || '',
    servicePlan: row.service_plan || '',
    wachtList: row.wacht_list || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listTable10Items(filters = {}) {
  await ensureTable10ItemsTable();

  const { search = '', group = '' } = filters;
  let sql = `
    SELECT id, gpuid, drug_name, disp_unit, drug_group, service_plan, wacht_list, created_at, updated_at
    FROM table10_items
    WHERE is_active = 1
  `;
  const params = [];

  if (search) {
    const term = `%${String(search).trim()}%`;
    sql += `
      AND (
        gpuid LIKE ?
        OR drug_name LIKE ?
        OR COALESCE(disp_unit, '') LIKE ?
        OR COALESCE(drug_group, '') LIKE ?
        OR COALESCE(service_plan, '') LIKE ?
        OR COALESCE(wacht_list, '') LIKE ?
      )
    `;
    params.push(term, term, term, term, term, term);
  }

  if (group) {
    sql += ' AND COALESCE(drug_group, \'\') = ?';
    params.push(String(group).trim());
  }

  sql += ' ORDER BY drug_name ASC, gpuid ASC';

  const rows = await query(sql, params);
  return rows.map(mapTable10Item);
}

async function listTable10Groups() {
  await ensureTable10ItemsTable();
  const rows = await query(`
    SELECT DISTINCT drug_group
    FROM table10_items
    WHERE is_active = 1 AND COALESCE(drug_group, '') <> ''
    ORDER BY drug_group ASC
  `);
  return rows.map((row) => row.drug_group);
}

async function createTable10Item(payload) {
  await ensureTable10ItemsTable();
  const normalized = normalizeTable10Row(payload);

  if (!normalized.gpuid || !normalized.drugName) {
    const error = new Error('GPUID and DrugName are required');
    error.status = 400;
    throw error;
  }

  await query(
    `INSERT INTO table10_items (gpuid, drug_name, disp_unit, drug_group, service_plan, wacht_list, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [
      normalized.gpuid,
      normalized.drugName,
      normalized.dispUnit || null,
      normalized.groupName || null,
      normalized.servicePlan || null,
      normalized.wachtList || null,
    ]
  );

  const rows = await query(
    `SELECT id, gpuid, drug_name, disp_unit, drug_group, service_plan, wacht_list, created_at, updated_at
     FROM table10_items
     WHERE gpuid = ? AND is_active = 1
     LIMIT 1`,
    [normalized.gpuid]
  );
  return mapTable10Item(rows[0]);
}

async function updateTable10Item(id, payload) {
  await ensureTable10ItemsTable();
  const normalized = normalizeTable10Row(payload);

  if (!normalized.gpuid || !normalized.drugName) {
    const error = new Error('GPUID and DrugName are required');
    error.status = 400;
    throw error;
  }

  const existingRows = await query(
    'SELECT id FROM table10_items WHERE id = ? AND is_active = 1 LIMIT 1',
    [id]
  );
  if (!existingRows[0]) {
    const error = new Error('Item not found');
    error.status = 404;
    throw error;
  }

  const duplicateRows = await query(
    'SELECT id FROM table10_items WHERE gpuid = ? AND id <> ? AND is_active = 1 LIMIT 1',
    [normalized.gpuid, id]
  );
  if (duplicateRows[0]) {
    const error = new Error('GPUID already exists');
    error.status = 409;
    throw error;
  }

  await query(
    `UPDATE table10_items
     SET gpuid = ?, drug_name = ?, disp_unit = ?, drug_group = ?, service_plan = ?, wacht_list = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      normalized.gpuid,
      normalized.drugName,
      normalized.dispUnit || null,
      normalized.groupName || null,
      normalized.servicePlan || null,
      normalized.wachtList || null,
      id,
    ]
  );

  const rows = await query(
    `SELECT id, gpuid, drug_name, disp_unit, drug_group, service_plan, wacht_list, created_at, updated_at
     FROM table10_items
     WHERE id = ? AND is_active = 1
     LIMIT 1`,
    [id]
  );
  return mapTable10Item(rows[0]);
}

async function deleteTable10Item(id) {
  await ensureTable10ItemsTable();
  const existingRows = await query(
    'SELECT id FROM table10_items WHERE id = ? AND is_active = 1 LIMIT 1',
    [id]
  );
  if (!existingRows[0]) {
    const error = new Error('Item not found');
    error.status = 404;
    throw error;
  }

  await query(
    'UPDATE table10_items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
}

function readWorkbookRowsFromBase64(fileContentBase64) {
  const buffer = Buffer.from(String(fileContentBase64 || ''), 'base64');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames.includes(DEFAULT_SHEET_NAME)
    ? DEFAULT_SHEET_NAME
    : workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('No worksheet found in Excel file');
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

async function importTable10Workbook(fileContentBase64) {
  await ensureTable10ItemsTable();

  const rows = readWorkbookRowsFromBase64(fileContentBase64);
  const deduped = new Map();
  let skippedRows = 0;

  for (const row of rows) {
    const normalized = normalizeTable10Row(row);
    if (!normalized.gpuid || !normalized.drugName) {
      skippedRows += 1;
      continue;
    }
    deduped.set(normalized.gpuid, normalized);
  }

  const uniqueRows = [...deduped.values()];
  if (!uniqueRows.length) {
    return {
      imported: 0,
      inserted: 0,
      updated: 0,
      skipped: skippedRows,
      total: 0,
    };
  }

  const gpuidParams = uniqueRows.map((row) => row.gpuid);
  const gpuidPlaceholders = gpuidParams.map(() => '?').join(', ');
  const existingRows = await query(
    `SELECT gpuid FROM table10_items WHERE gpuid IN (${gpuidPlaceholders})`,
    gpuidParams
  );
  const existingSet = new Set(existingRows.map((row) => row.gpuid));

  for (const row of uniqueRows) {
    await query(
      `INSERT INTO table10_items (gpuid, drug_name, disp_unit, drug_group, service_plan, wacht_list, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         drug_name = VALUES(drug_name),
         disp_unit = VALUES(disp_unit),
         drug_group = VALUES(drug_group),
         service_plan = VALUES(service_plan),
         wacht_list = VALUES(wacht_list),
         is_active = VALUES(is_active),
         updated_at = CURRENT_TIMESTAMP`,
      [
        row.gpuid,
        row.drugName,
        row.dispUnit || null,
        row.groupName || null,
        row.servicePlan || null,
        row.wachtList || null,
      ]
    );
  }

  const productSync = await syncTable10RowsToProducts(uniqueRows);

  const [countRow] = await query(
    'SELECT COUNT(*) AS total FROM table10_items WHERE is_active = 1'
  );

  const inserted = uniqueRows.filter((row) => !existingSet.has(row.gpuid)).length;
  const updated = uniqueRows.length - inserted;

  return {
    imported: uniqueRows.length,
    inserted,
    updated,
    skipped: skippedRows,
    total: Number(countRow.total || 0),
    productsInserted: productSync.insertedProducts,
    productsUpdated: productSync.updatedProducts,
  };
}

async function ensureCategoriesForRows(rows) {
  const categoryNames = new Set(['Uncategorized']);

  for (const row of rows) {
    const categoryName = cleanString(row.groupName, 100) || 'Uncategorized';
    categoryNames.add(categoryName);
  }

  const names = [...categoryNames];
  const categoryMap = new Map();

  for (const chunk of chunkArray(names, BATCH_SIZE)) {
    const placeholders = buildInClause(chunk);
    const existingRows = await query(
      `SELECT id, category_name FROM categories WHERE category_name IN (${placeholders})`,
      chunk
    );
    for (const row of existingRows) {
      categoryMap.set(row.category_name, Number(row.id));
    }
  }

  for (const name of names) {
    if (categoryMap.has(name)) {
      continue;
    }

    await query(
      'INSERT INTO categories (category_name, is_active) VALUES (?, 1)',
      [name]
    );

    const insertedRows = await query(
      'SELECT id, category_name FROM categories WHERE category_name = ? LIMIT 1',
      [name]
    );
    if (insertedRows[0]) {
      categoryMap.set(insertedRows[0].category_name, Number(insertedRows[0].id));
    }
  }

  return categoryMap;
}

async function syncTable10RowsToProducts(rows) {
  if (!rows.length) {
    return { insertedProducts: 0, updatedProducts: 0 };
  }

  const rowByGpuid = new Map(rows.map((row) => [row.gpuid, row]));
  const categoryMap = await ensureCategoriesForRows(rows);
  const productCodes = rows.map((row) => row.gpuid);
  const existingSet = new Set();

  for (const chunk of chunkArray(productCodes, BATCH_SIZE)) {
    const placeholders = buildInClause(chunk);
    const existingRows = await query(
      `SELECT product_code FROM products WHERE product_code IN (${placeholders})`,
      chunk
    );
    for (const row of existingRows) {
      existingSet.add(row.product_code);
    }
  }

  for (const row of rows) {
    const categoryName = cleanString(row.groupName, 100) || 'Uncategorized';
    const categoryId = categoryMap.get(categoryName) || null;
    const minStockLevel = pickNumber(row.wachtList, 0);

    await query(
      `INSERT INTO products (
         product_code, product_name, category_id, unit_sell, min_stock_level, reorder_point, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         product_name = VALUES(product_name),
         category_id = VALUES(category_id),
         unit_sell = VALUES(unit_sell),
         min_stock_level = VALUES(min_stock_level),
         reorder_point = VALUES(reorder_point),
         is_active = VALUES(is_active),
         updated_at = CURRENT_TIMESTAMP`,
      [
        row.gpuid,
        row.drugName,
        categoryId,
        row.dispUnit || null,
        minStockLevel,
        minStockLevel,
      ]
    );
  }

  for (const chunk of chunkArray(productCodes, BATCH_SIZE)) {
    const placeholders = buildInClause(chunk);
    const productRows = await query(
      `SELECT id, product_code, min_stock_level, reorder_point FROM products WHERE product_code IN (${placeholders})`,
      chunk
    );

    for (const product of productRows) {
      const sourceRow = rowByGpuid.get(product.product_code);
      const minStockLevel = pickNumber(sourceRow?.wachtList, 0);
      const openingQuantity = pickNumber(sourceRow?.openingQuantity, 0);

      await query(
        `INSERT INTO stock_levels (product_id, quantity, min_level, reorder_point, last_counted_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           quantity = VALUES(quantity),
           min_level = VALUES(min_level),
           reorder_point = VALUES(reorder_point),
           updated_at = CURRENT_TIMESTAMP`,
        [product.id, openingQuantity, minStockLevel, minStockLevel]
      );
    }
  }

  const insertedProducts = rows.filter((row) => !existingSet.has(row.gpuid)).length;
  const updatedProducts = rows.length - insertedProducts;
  return { insertedProducts, updatedProducts };
}

module.exports = {
  ensureTable10ItemsTable,
  listTable10Items,
  listTable10Groups,
  createTable10Item,
  updateTable10Item,
  deleteTable10Item,
  importTable10Workbook,
  syncTable10RowsToProducts,
};
