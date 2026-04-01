/**
 * Dashboard Routes for Inventory Phoubon
 * Dashboard statistics and alerts
 */

const express = require('express');
const { query } = require('../db/pool');
const { isAuthenticated } = require('../middleware/auth');
const { lotBalanceJoin, currentStockExpr } = require('../utils/stock-balance');
const { unitJoin, unitNameExpr } = require('../utils/unit-name');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

/**
 * GET /dashboard/summary
 * Get dashboard summary statistics
 */
router.get('/summary', async (req, res, next) => {
  try {
    // Total products and stock value
    const [inventory] = await query(`
      SELECT
        COUNT(*) AS total_products,
        SUM(CASE WHEN ${currentStockExpr} > 0 THEN 1 ELSE 0 END) AS products_in_stock,
        COALESCE(SUM(${currentStockExpr} * COALESCE(p.unit_cost, p.cost_price, 0)), 0) AS total_stock_value,
        SUM(CASE WHEN ${currentStockExpr} <= COALESCE(sl.reorder_point, p.reorder_point, 0) THEN 1 ELSE 0 END) AS low_stock_count
      FROM products p
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      ${lotBalanceJoin}
      WHERE p.is_active = 1
    `);

    // Total suppliers
    const [suppliers] = await query('SELECT COUNT(*) AS total_suppliers FROM suppliers WHERE is_active = 1');

    // Pending orders
    const [orders] = await query('SELECT COUNT(*) AS pending_orders FROM purchase_orders WHERE status = "pending"');

    // Recent transactions today
    const [transactions] = await query(
      'SELECT COUNT(*) AS recent_transactions FROM stock_movements WHERE DATE(created_at) = CURDATE()'
    );

    // Expiring soon (90 days)
    const [expiry] = await query(`
      SELECT COUNT(*) AS expiring_soon
      FROM stock_lots
      WHERE quantity > 0 
        AND expiry_date IS NOT NULL 
        AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
    `);

    res.json({
      totalStockValue: Number(inventory.total_stock_value || 0),
      expiringSoon: Number(expiry.expiring_soon || 0),
      lowStockCount: Number(inventory.low_stock_count || 0),
      pendingOrders: Number(orders.pending_orders || 0),
      recentTransactions: Number(transactions.recent_transactions || 0),
      totalProducts: Number(inventory.total_products || 0),
      productsInStock: Number(inventory.products_in_stock || 0),
      totalSuppliers: Number(suppliers.total_suppliers || 0)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/expiry-alerts
 * Get expiry alerts
 */
router.get('/expiry-alerts', async (req, res, next) => {
  try {
    const days = Number(req.query.days || 90);

    const rows = await query(`
      SELECT
        sl.id,
        sl.lot_number,
        sl.product_id,
        p.product_code,
        p.product_name,
        sl.quantity,
        sl.expiry_date,
        ${unitNameExpr} AS unit,
        sl.supplier AS location,
        DATEDIFF(sl.expiry_date, CURDATE()) AS days_until_expiry
      FROM stock_lots sl
      JOIN products p ON p.id = sl.product_id
      ${unitJoin}
      WHERE sl.quantity > 0
        AND sl.expiry_date IS NOT NULL
        AND sl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY sl.expiry_date ASC
      LIMIT 200
    `, [days]);

    res.json(rows.map(row => ({
      id: String(row.id),
      productId: row.product_code,
      productName: row.product_name,
      lotNumber: row.lot_number,
      expiryDate: row.expiry_date,
      quantity: Number(row.quantity || 0),
      unit: row.unit || '',
      status: Number(row.days_until_expiry) <= 30 ? 'critical' : Number(row.days_until_expiry) <= 60 ? 'warning' : 'normal',
      daysUntilExpiry: Number(row.days_until_expiry || 0),
      location: row.location || 'MAIN'
    })));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/low-stock
 * Get low stock products
 */
router.get('/low-stock', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT
        p.product_code AS id,
        p.product_code AS code,
        p.product_name AS name,
        p.generic_name AS generic_name,
        COALESCE(c.category_name, 'ไม่ระบุหมวด') AS category,
        ${unitNameExpr} AS unit,
        ${currentStockExpr} AS current_stock,
        COALESCE(sl.min_level, p.min_stock_level, 0) AS min_level,
        COALESCE(sl.max_level, p.max_stock_level, 0) AS max_level,
        COALESCE(p.unit_cost, p.cost_price, 0) AS unit_cost
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${unitJoin}
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      ${lotBalanceJoin}
      WHERE p.is_active = 1
        AND ${currentStockExpr} <= COALESCE(sl.reorder_point, p.reorder_point, 0)
      ORDER BY ${currentStockExpr} ASC
      LIMIT 100
    `);

    res.json(rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      genericName: row.generic_name || '',
      category: row.category || 'ไม่ระบุหมวด',
      unit: row.unit || '',
      minLevel: Number(row.min_level || 0),
      maxLevel: Number(row.max_level || 0),
      currentStock: Number(row.current_stock || 0),
      reorderPoint: Number(row.min_level || 0),
      unitCost: Number(row.unit_cost || 0),
      barcode: row.code
    })));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /dashboard/recent-movements
 * Get recent stock movements
 */
router.get('/recent-movements', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const rows = await query(`
      SELECT sm.*, p.product_code, p.product_name
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      ORDER BY sm.created_at DESC
      LIMIT ?
    `, [limit]);

    res.json(rows.map(row => ({
      id: String(row.id),
      date: row.created_at,
      type: row.type,
      productId: row.product_code,
      productName: row.product_name,
      quantity: Number(row.quantity || 0),
      previousStock: Number(row.previous_stock || 0),
      newStock: Number(row.new_stock || 0),
      notes: row.notes || ''
    })));
  } catch (error) {
    next(error);
  }
});

module.exports = router;