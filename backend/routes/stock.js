/**
 * Stock Routes for Inventory Phoubon
 * Stock management operations
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
 * Map stock item row to response object
 */
function mapStockItem(row) {
  return {
    id: String(row.id),
    productId: row.product_code,
    productName: row.product_name,
    productCode: row.product_code,
    lotNumber: row.lot_number,
    expiryDate: row.expiry_date,
    quantity: Number(row.quantity || 0),
    unit: row.unit || '',
    location: row.supplier || 'MAIN',
    status: Number(row.quantity || 0) > 0 ? 'available' : 'empty',
    receivedDate: row.received_date,
    unitCost: Number(row.unit_price || 0)
  };
}

/**
 * GET /stock/items
 * List all stock items
 */
router.get('/items', async (req, res, next) => {
  try {
    const params = [];
    let where = 'WHERE sl.quantity > 0';
    
    if (req.query.productId) {
      where += ' AND p.product_code = ?';
      params.push(req.query.productId);
    }

    const rows = await query(
      `SELECT sl.*, p.product_code, p.product_name, ${unitNameExpr} AS unit
       FROM stock_lots sl
       JOIN products p ON p.id = sl.product_id
       ${unitJoin}
       ${where}
       ORDER BY COALESCE(sl.expiry_date, '9999-12-31') ASC, sl.received_date ASC`,
      params
    );

    res.json(rows.map(mapStockItem));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /stock/scan/:barcode
 * Scan barcode and get product info with stock
 */
router.get('/scan/:barcode', async (req, res, next) => {
  try {
    const rows = await query(
      `${lotBalanceJoin.includes('SELECT') ? '' : lotBalanceJoin}
       SELECT
        p.id,
        p.product_code AS code,
        p.product_name AS name,
        p.generic_name AS generic_name,
        COALESCE(c.category_name, 'ไม่ระบุหมวด') AS category,
        ${unitNameExpr} AS unit,
        ${currentStockExpr} AS current_stock,
        COALESCE(sl.min_level, p.min_stock_level, 0) AS min_level,
        COALESCE(sl.max_level, p.max_stock_level, 0) AS max_level,
        COALESCE(p.unit_cost, p.cost_price, 0) AS unit_cost,
        COALESCE(p.barcode, p.product_code) AS barcode
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${unitJoin}
       LEFT JOIN stock_levels sl ON sl.product_id = p.id
       ${lotBalanceJoin}
       WHERE p.product_code = ? OR p.barcode = ?
       LIMIT 1`,
      [req.params.barcode, req.params.barcode]
    );

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get stock lots for this product
    const stockLots = await query(
      `SELECT sl.*, p.product_name, ${unitNameExpr} AS unit
       FROM stock_lots sl
       JOIN products p ON p.id = sl.product_id
       ${unitJoin}
       WHERE sl.product_id = ? AND sl.quantity > 0
       ORDER BY COALESCE(sl.expiry_date, '9999-12-31') ASC`,
      [rows[0].id]
    );

    res.json({
      success: true,
      product: {
        id: rows[0].code,
        code: rows[0].code,
        name: rows[0].name,
        genericName: rows[0].generic_name || '',
        category: rows[0].category,
        unit: rows[0].unit || '',
        currentStock: Number(rows[0].current_stock || 0),
        minLevel: Number(rows[0].min_level || 0),
        maxLevel: Number(rows[0].max_level || 0),
        unitCost: Number(rows[0].unit_cost || 0),
        barcode: rows[0].barcode || rows[0].code
      },
      stockItems: stockLots.map(mapStockItem)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /stock/goods-receipt
 * Receive goods into stock
 */
router.post('/goods-receipt', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const { supplierId = '', supplierName = 'Unknown', invoiceNumber = '', notes = '', items = [] } = req.body;

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }

    await beginTransaction(connection);

    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        const { productId, lotNumber, expiryDate, quantity, unitCost, location } = item;

        // Find product
        const [productRows] = await connection.execute(
          'SELECT id, product_code FROM products WHERE product_code = ? OR id = ? LIMIT 1',
          [productId, Number(productId) || 0]
        );

        if (!productRows[0]) {
          errors.push({ productId, error: 'Product not found' });
          continue;
        }

        const product = productRows[0];

        // Insert or update stock lot
        await connection.execute(
          `INSERT INTO stock_lots (product_id, lot_number, quantity, original_quantity, expiry_date, supplier, unit_price, received_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             quantity = quantity + VALUES(quantity),
             original_quantity = original_quantity + VALUES(original_quantity),
             unit_price = VALUES(unit_price),
             expiry_date = COALESCE(expiry_date, VALUES(expiry_date))`,
          [product.id, lotNumber || 'NO-LOT', quantity, quantity, expiryDate || null, supplierName, unitCost || 0]
        );

        // Log stock movement
        await connection.execute(
          `INSERT INTO stock_movements (type, product_id, lot_id, quantity, previous_stock, new_stock, notes, user_id, created_at)
           SELECT 'receipt', ?, sl.id, ?, 
             COALESCE(sl2.quantity, 0) - ?,
             COALESCE(sl2.quantity, 0),
             ?, ?, NOW()
           FROM stock_lots sl
           LEFT JOIN stock_levels sl2 ON sl2.product_id = sl.product_id
           WHERE sl.product_id = ? AND sl.lot_number = ?
           ORDER BY sl.id DESC LIMIT 1`,
          [product.id, quantity, quantity, `Goods receipt - ${invoiceNumber || 'Manual'}`, req.user.id, product.id, lotNumber || 'NO-LOT']
        );

        // Update stock level
        await connection.execute(
          `INSERT INTO stock_levels (product_id, quantity, last_counted_at, updated_at)
           VALUES (?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             quantity = quantity + VALUES(quantity),
             updated_at = CURRENT_TIMESTAMP`,
          [product.id, quantity]
        );

        results.push({
          productId: product.product_code,
          lotNumber,
          quantity,
          success: true
        });
      } catch (itemError) {
        errors.push({
          productId: item.productId,
          error: itemError.message
        });
      }
    }

    await commit(connection);

    res.status(201).json({
      success: true,
      message: 'Goods receipt processed',
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

/**
 * POST /stock/adjustment
 * Adjust stock quantity
 */
router.post('/adjustment', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const { productId, lotNumber, previousQty, newQty, reason, notes = '' } = req.body;
    const delta = Number(newQty || 0) - Number(previousQty || 0);

    if (!productId || !lotNumber) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and lot number are required'
      });
    }

    // Find product
    const [productRows] = await connection.execute(
      'SELECT id FROM products WHERE product_code = ? LIMIT 1',
      [productId]
    );

    if (!productRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await beginTransaction(connection);

    // Update stock lot
    await connection.execute(
      'UPDATE stock_lots SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND lot_number = ?',
      [newQty, productRows[0].id, lotNumber]
    );

    // Record adjustment
    await connection.execute(
      `INSERT INTO stock_adjustments (product_id, lot_id, adjustment_type, quantity, previous_stock, new_stock, reason, user_id, created_at)
       VALUES (?, 
         (SELECT id FROM stock_lots WHERE product_id = ? AND lot_number = ? LIMIT 1),
         ?, ?, ?, ?, ?, ?, NOW())`,
      [productRows[0].id, productRows[0].id, lotNumber, delta >= 0 ? 'increase' : 'decrease', Math.abs(delta), previousQty, newQty, reason || 'Manual adjustment', req.user.id]
    );

    // Log movement
    await connection.execute(
      `INSERT INTO stock_movements (type, product_id, lot_id, quantity, previous_stock, new_stock, notes, user_id, created_at)
       VALUES ('adjust', ?, 
         (SELECT id FROM stock_lots WHERE product_id = ? AND lot_number = ? LIMIT 1),
         ?, ?, ?, ?, ?, NOW())`,
      [productRows[0].id, productRows[0].id, lotNumber, delta, previousQty, newQty, notes || reason, req.user.id]
    );

    // Update stock level
    await connection.execute(
      'UPDATE stock_levels SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
      [delta, productRows[0].id]
    );

    await commit(connection);

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      adjustment: { productId, lotNumber, previousQty, newQty, delta }
    });
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

/**
 * POST /stock/deduct
 * Deduct stock with FEFO (First Expiry First Out)
 */
router.post('/deduct', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const { productId, quantity, notes = '' } = req.body;
    const qty = Number(quantity || 0);

    if (!productId || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and quantity are required'
      });
    }

    // Find product
    const [productRows] = await connection.execute(
      'SELECT id, product_code FROM products WHERE product_code = ? LIMIT 1',
      [productId]
    );

    if (!productRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productRows[0];

    // Get available lots (FEFO order)
    const lots = await query(
      `SELECT id, lot_number, quantity, expiry_date
       FROM stock_lots
       WHERE product_id = ? AND quantity > 0
       ORDER BY 
         CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
         expiry_date ASC,
         received_date ASC`,
      [product.id]
    );

    let remaining = qty;
    const usedLots = [];

    await beginTransaction(connection);

    for (const lot of lots) {
      if (remaining <= 0) break;

      const used = Math.min(Number(lot.quantity || 0), remaining);
      remaining -= used;

      usedLots.push({ lotNumber: lot.lot_number, quantity: used });

      // Update lot
      await connection.execute(
        'UPDATE stock_lots SET quantity = quantity - ? WHERE id = ?',
        [used, lot.id]
      );

      // Log movement
      await connection.execute(
        `INSERT INTO stock_movements (type, product_id, lot_id, quantity, notes, user_id, created_at)
         VALUES ('deduct', ?, ?, ?, ?, ?, NOW())`,
        [product.id, lot.id, -used, notes || 'FEFO deduction', req.user.id]
      );
    }

    if (remaining > 0) {
      await rollback(connection);
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock for FEFO deduction',
        requested: qty,
        available: qty - remaining
      });
    }

    // Update stock level
    await connection.execute(
      'UPDATE stock_levels SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
      [qty, product.id]
    );

    await commit(connection);

    res.json({
      success: true,
      message: 'Stock deducted successfully (FEFO)',
      usedLots
    });
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

/**
 * POST /stock/import/drugstorereceive-bundle
 * Import stock from CSV bundle
 */
router.post('/import/drugstorereceive-bundle', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const { receiveContent = '', detailContent = '' } = req.body || {};

    if (!String(receiveContent || '').trim() || !String(detailContent || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Both receive and detail CSV contents are required'
      });
    }

    // Parse CSV content
    const parseCSV = (content) => {
      const lines = content.trim().split('\n');
      if (lines.length < 2) return [];
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });
        data.push(row);
      }
      
      return data;
    };

    const receiveData = parseCSV(receiveContent);
    const detailData = parseCSV(detailContent);

    await beginTransaction(connection);

    let imported = 0;
    const errors = [];

    for (const detail of detailData) {
      try {
        const productCode = detail.product_code || detail.GPUID || detail.code || '';
        const lotNumber = detail.lot_number || detail.lot || 'NO-LOT';
        const quantity = Number(detail.quantity || detail.qty || 0);
        const expiryDate = detail.expiry_date || detail.expiry || null;
        const unitCost = Number(detail.unit_cost || detail.cost || 0);

        if (!productCode || quantity <= 0) continue;

        // Find product
        const [productRows] = await connection.execute(
          'SELECT id FROM products WHERE product_code = ? LIMIT 1',
          [productCode]
        );

        if (!productRows[0]) {
          errors.push({ productCode, error: 'Product not found' });
          continue;
        }

        await connection.execute(
          `INSERT INTO stock_lots (product_id, lot_number, quantity, original_quantity, expiry_date, unit_price, received_date)
           VALUES (?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             quantity = quantity + VALUES(quantity),
             original_quantity = original_quantity + VALUES(original_quantity)`,
          [productRows[0].id, lotNumber, quantity, quantity, expiryDate || null, unitCost]
        );

        await connection.execute(
          'UPDATE stock_levels SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
          [quantity, productRows[0].id]
        );

        imported++;
      } catch (itemError) {
        errors.push({ productCode: detail.product_code || 'unknown', error: itemError.message });
      }
    }

    await commit(connection);

    res.status(201).json({
      success: true,
      message: 'Import completed',
      imported,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

module.exports = router;