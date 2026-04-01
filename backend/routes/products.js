/**
 * Products Routes for Inventory Phoubon
 * CRUD operations for products
 */

const express = require('express');
const { pool, query, getConnection, beginTransaction, commit, rollback, releaseConnection } = require('../db/pool');
const { isAuthenticated } = require('../middleware/auth');
const { lotBalanceJoin, currentStockExpr } = require('../utils/stock-balance');
const { unitJoin, unitNameExpr } = require('../utils/unit-name');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

/**
 * Map product row to response object
 */
function mapProduct(row) {
  return {
    id: row.product_code || row.code,
    code: row.product_code || row.code,
    name: row.product_name || row.name,
    genericName: row.generic_name || '',
    drugtypeCode: row.drugtype_code || '',
    drugtypeName: row.drugtype_name || 'ไม่ระบุประเภท',
    category: row.category || 'ไม่ระบุหมวด',
    unit: row.unit || '',
    minLevel: Number(row.min_level || 0),
    maxLevel: Number(row.max_level || 0),
    currentStock: Number(row.current_stock || 0),
    reorderPoint: Number(row.reorder_point || 0),
    unitCost: Number(row.unit_cost || 0),
    barcode: row.barcode || row.product_code || row.code,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

// Base SELECT query
const baseSelect = `
  SELECT
    p.id,
    p.product_code,
    p.product_name,
    p.generic_name,
    COALESCE(dt.drugtype_code, '') AS drugtype_code,
    COALESCE(dt.drugtype_name, 'ไม่ระบุประเภท') AS drugtype_name,
    COALESCE(c.category_name, 'ไม่ระบุหมวด') AS category,
    ${unitNameExpr} AS unit,
    ${currentStockExpr} AS current_stock,
    COALESCE(sl.min_level, p.min_stock_level, 0) AS min_level,
    COALESCE(sl.max_level, p.max_stock_level, 0) AS max_level,
    COALESCE(sl.reorder_point, p.reorder_point, 0) AS reorder_point,
    COALESCE(p.unit_cost, p.cost_price, 0) AS unit_cost,
    p.barcode,
    p.created_at,
    p.updated_at
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN drugtypes dt ON dt.drugtype_code = p.drugtype_code AND dt.is_active = 1
  ${unitJoin}
  LEFT JOIN stock_levels sl ON sl.product_id = p.id
  ${lotBalanceJoin}
`;

const baseFrom = `
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN drugtypes dt ON dt.drugtype_code = p.drugtype_code AND dt.is_active = 1
  ${unitJoin}
  LEFT JOIN stock_levels sl ON sl.product_id = p.id
  ${lotBalanceJoin}
`;

/**
 * GET /products
 * List products with pagination, search, and filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { search = '', category = '', drugtype = '', lowStock = 'false', inStock = 'false', page, limit } = req.query;
    
    let where = 'WHERE p.is_active = 1';
    const params = [];

    if (search) {
      const term = `%${search}%`;
      where += ` AND (
        p.product_code LIKE ?
        OR p.product_name LIKE ?
        OR COALESCE(p.generic_name, '') LIKE ?
        OR COALESCE(p.barcode, '') LIKE ?
      )`;
      params.push(term, term, term, term);
    }

    if (category) {
      where += ` AND COALESCE(c.category_name, 'ไม่ระบุหมวด') = ?`;
      params.push(category);
    }

    if (drugtype) {
      where += ` AND COALESCE(dt.drugtype_code, '') = ?`;
      params.push(drugtype);
    }

    if (String(lowStock) === 'true') {
      where += ` AND ${currentStockExpr} <= COALESCE(sl.reorder_point, p.reorder_point, 0)`;
    }

    if (String(inStock) === 'true') {
      where += ` AND ${currentStockExpr} > 0`;
    }

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(Number(limit) || 0, 0), 200);
    const usePagination = parsedLimit > 0;

    if (!usePagination) {
      const rows = await query(`${baseSelect} ${where} ORDER BY p.product_name ASC`, params);
      return res.json(rows.map(mapProduct));
    }

    const offset = (parsedPage - 1) * parsedLimit;
    const [countRow] = await query(`SELECT COUNT(*) AS total ${baseFrom} ${where}`, params);
    const rows = await query(
      `${baseSelect} ${where} ORDER BY p.product_name ASC LIMIT ? OFFSET ?`,
      [...params, parsedLimit, offset]
    );

    res.json({
      items: rows.map(mapProduct),
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: Number(countRow.total || 0),
        totalPages: Math.max(Math.ceil(Number(countRow.total || 0) / parsedLimit), 1)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/categories/list
 * List all categories
 */
router.get('/categories/list', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT category_name
      FROM categories
      WHERE is_active = 1
      ORDER BY category_name ASC
    `);
    res.json(rows.map(row => row.category_name));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/drugtypes/list
 * List all drug types
 */
router.get('/drugtypes/list', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT drugtype_code AS code, drugtype_name AS name
      FROM drugtypes
      WHERE is_active = 1
      ORDER BY sort_order ASC, drugtype_code ASC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

/**
 * Find category ID by name
 */
async function findCategoryId(categoryName) {
  if (!String(categoryName || '').trim()) {
    return null;
  }

  const rows = await query(
    'SELECT id FROM categories WHERE category_name = ? AND is_active = 1 LIMIT 1',
    [String(categoryName).trim()]
  );

  return rows[0] ? Number(rows[0].id) : null;
}

/**
 * Normalize product payload
 */
function normalizeProductPayload(body) {
  return {
    code: String(body.code || '').trim(),
    name: String(body.name || '').trim(),
    genericName: String(body.genericName || '').trim(),
    category: String(body.category || '').trim(),
    drugtypeCode: String(body.drugtypeCode || '').trim(),
    unit: String(body.unit || '').trim(),
    minLevel: Math.max(Number(body.minLevel) || 0, 0),
    maxLevel: Math.max(Number(body.maxLevel) || 0, 0),
    reorderPoint: Math.max(Number(body.reorderPoint) || 0, 0),
    unitCost: Math.max(Number(body.unitCost) || 0, 0),
    barcode: String(body.barcode || '').trim()
  };
}

/**
 * POST /products
 * Create a new product
 */
router.post('/', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const payload = normalizeProductPayload(req.body);

    if (!payload.code || !payload.name) {
      return res.status(400).json({
        success: false,
        message: 'Product code and name are required'
      });
    }

    const categoryId = await findCategoryId(payload.category);
    if (payload.category && !categoryId) {
      // Create category if not exists
      const [catResult] = await connection.execute(
        'INSERT INTO categories (category_name, is_active) VALUES (?, 1)',
        [payload.category]
      );
      // Re-fetch to get the ID
      const [newCat] = await connection.execute(
        'SELECT id FROM categories WHERE category_name = ?',
        [payload.category]
      );
      if (newCat[0]) {
        // Use new category ID
      }
    }

    // Check for duplicate
    const existing = await query('SELECT id FROM products WHERE product_code = ? LIMIT 1', [payload.code]);
    if (existing[0]) {
      return res.status(409).json({
        success: false,
        message: 'Product code already exists'
      });
    }

    await beginTransaction(connection);

    const [insertResult] = await connection.execute(
      `INSERT INTO products (
        product_code, product_name, generic_name, category_id, drugtype_code, unit_sell,
        min_stock_level, max_stock_level, reorder_point, cost_price, unit_cost, barcode, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        payload.code,
        payload.name,
        payload.genericName || null,
        categoryId,
        payload.drugtypeCode || null,
        payload.unit || null,
        payload.minLevel,
        payload.maxLevel,
        payload.reorderPoint,
        payload.unitCost,
        payload.unitCost,
        payload.barcode || null
      ]
    );

    await connection.execute(
      `INSERT INTO stock_levels (product_id, quantity, min_level, max_level, reorder_point, last_counted_at)
       VALUES (?, 0, ?, ?, ?, NOW())`,
      [insertResult.insertId, payload.minLevel, payload.maxLevel, payload.reorderPoint]
    );

    await commit(connection);

    const rows = await query(`${baseSelect} AND p.product_code = ?`, [payload.code]);
    res.status(201).json({
      success: true,
      product: mapProduct(rows[0])
    });
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

/**
 * GET /products/:id
 * Get product by code
 */
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await query(`${baseSelect} AND p.product_code = ?`, [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    res.json({
      success: true,
      product: mapProduct(rows[0])
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /products/:id
 * Update product
 */
router.put('/:id', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const payload = normalizeProductPayload(req.body);

    // Check product exists
    const existingRows = await query('SELECT id FROM products WHERE product_code = ? LIMIT 1', [req.params.id]);
    if (!existingRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const categoryId = await findCategoryId(payload.category);
    if (payload.category && !categoryId) {
      // Create category if not exists
      await connection.execute(
        'INSERT INTO categories (category_name, is_active) VALUES (?, 1)',
        [payload.category]
      );
    }

    // Check for duplicate code
    if (payload.code && payload.code !== req.params.id) {
      const duplicate = await query('SELECT id FROM products WHERE product_code = ? LIMIT 1', [payload.code]);
      if (duplicate[0]) {
        return res.status(409).json({
          success: false,
          message: 'Product code already exists'
        });
      }
    }

    const finalCode = payload.code || req.params.id;

    await beginTransaction(connection);

    await connection.execute(
      `UPDATE products
       SET
         product_code = ?,
         product_name = ?,
         generic_name = ?,
         category_id = ?,
         drugtype_code = ?,
         unit_sell = ?,
         min_stock_level = ?,
         max_stock_level = ?,
         reorder_point = ?,
         cost_price = ?,
         unit_cost = ?,
         barcode = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE product_code = ?`,
      [
        finalCode,
        payload.name,
        payload.genericName || null,
        categoryId,
        payload.drugtypeCode || null,
        payload.unit || null,
        payload.minLevel,
        payload.maxLevel,
        payload.reorderPoint,
        payload.unitCost,
        payload.unitCost,
        payload.barcode || null,
        req.params.id
      ]
    );

    await connection.execute(
      `UPDATE stock_levels
       SET min_level = ?, max_level = ?, reorder_point = ?, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = ?`,
      [payload.minLevel, payload.maxLevel, payload.reorderPoint, existingRows[0].id]
    );

    await commit(connection);

    const rows = await query(`${baseSelect} AND p.product_code = ?`, [finalCode]);
    res.json({
      success: true,
      product: mapProduct(rows[0])
    });
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

/**
 * DELETE /products/:id
 * Soft delete product
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const existingRows = await query('SELECT id FROM products WHERE product_code = ? LIMIT 1', [req.params.id]);
    if (!existingRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await query('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE product_code = ?', [req.params.id]);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;