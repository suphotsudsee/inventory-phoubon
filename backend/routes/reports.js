/**
 * Reports Routes for Inventory Phoubon
 * Various reports and exports
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
 * Helper: Send CSV response
 */
function sendCsv(res, filename, headers, rows) {
  const content = [
    headers.join(','),
    ...rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + content); // BOM for Thai characters
}

/**
 * GET /reports/inventory-valuation
 * Inventory valuation report by category
 */
router.get('/inventory-valuation', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT
        COALESCE(c.category_name, 'ไม่ระบุหมวด') AS category,
        COUNT(*) AS item_count,
        COALESCE(SUM(${currentStockExpr}), 0) AS total_quantity,
        COALESCE(SUM(${currentStockExpr} * COALESCE(p.unit_cost, p.cost_price, 0)), 0) AS total_value
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      ${lotBalanceJoin}
      WHERE p.is_active = 1
      GROUP BY COALESCE(c.category_name, 'ไม่ระบุหมวด')
      ORDER BY total_value DESC
    `);

    const grandTotal = rows.reduce((sum, row) => sum + Number(row.total_value || 0), 0);

    res.json(rows.map(row => ({
      category: row.category,
      itemCount: Number(row.item_count || 0),
      totalQuantity: Number(row.total_quantity || 0),
      totalValue: Number(row.total_value || 0),
      percentage: grandTotal > 0 ? (Number(row.total_value || 0) / grandTotal) * 100 : 0
    })));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/inventory-valuation/export
 * Export inventory valuation as CSV
 */
router.get('/inventory-valuation/export', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT
        COALESCE(c.category_name, 'ไม่ระบุหมวด') AS category,
        COUNT(*) AS item_count,
        COALESCE(SUM(${currentStockExpr}), 0) AS total_quantity,
        COALESCE(SUM(${currentStockExpr} * COALESCE(p.unit_cost, p.cost_price, 0)), 0) AS total_value
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      ${lotBalanceJoin}
      WHERE p.is_active = 1
      GROUP BY COALESCE(c.category_name, 'ไม่ระบุหมวด')
      ORDER BY total_value DESC
    `);

    sendCsv(
      res,
      'inventory-valuation.csv',
      ['Category', 'Item Count', 'Total Quantity', 'Total Value'],
      rows.map(row => [row.category, row.item_count, row.total_quantity, row.total_value])
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/stock-movements
 * Stock movements report
 */
router.get('/stock-movements', async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (startDate) {
      where += ' AND DATE(sm.created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      where += ' AND DATE(sm.created_at) <= ?';
      params.push(endDate);
    }

    if (type) {
      where += ' AND sm.type = ?';
      params.push(type);
    }

    const rows = await query(`
      SELECT sm.*, p.product_code, p.product_name, ${unitNameExpr} AS unit
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      ${unitJoin}
      ${where}
      ORDER BY sm.created_at DESC
      LIMIT 500
    `, params);

    res.json(rows.map(row => ({
      id: String(row.id),
      date: row.created_at,
      productId: row.product_code,
      productName: row.product_name,
      lotNumber: row.lot_number || '',
      movementType: row.type,
      quantity: Number(row.quantity || 0),
      unit: row.unit || '',
      previousStock: Number(row.previous_stock || 0),
      newStock: Number(row.new_stock || 0),
      reference: row.notes || ''
    })));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/stock-movements/export
 * Export stock movements as CSV
 */
router.get('/stock-movements/export', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (startDate) {
      where += ' AND DATE(sm.created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      where += ' AND DATE(sm.created_at) <= ?';
      params.push(endDate);
    }

    const rows = await query(`
      SELECT sm.created_at, sm.type, p.product_code, p.product_name, sm.quantity, sm.previous_stock, sm.new_stock, sm.notes
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      ${where}
      ORDER BY sm.created_at DESC
      LIMIT 1000
    `, params);

    sendCsv(
      res,
      'stock-movements.csv',
      ['Date', 'Type', 'Product Code', 'Product Name', 'Quantity', 'Previous Stock', 'New Stock', 'Notes'],
      rows.map(row => [row.created_at, row.type, row.product_code, row.product_name, row.quantity, row.previous_stock, row.new_stock, row.notes])
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/expiry
 * Expiry report
 */
router.get('/expiry', async (req, res, next) => {
  try {
    const { days = 180 } = req.query;

    const rows = await query(`
      SELECT
        sl.id,
        sl.lot_number,
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
      LIMIT 500
    `, [Number(days)]);

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
 * GET /reports/expiry/export
 * Export expiry report as CSV
 */
router.get('/expiry/export', async (req, res, next) => {
  try {
    const { days = 180 } = req.query;

    const rows = await query(`
      SELECT
        sl.lot_number,
        p.product_code,
        p.product_name,
        sl.quantity,
        sl.expiry_date,
        sl.supplier,
        DATEDIFF(sl.expiry_date, CURDATE()) AS days_until_expiry
      FROM stock_lots sl
      JOIN products p ON p.id = sl.product_id
      WHERE sl.quantity > 0 
        AND sl.expiry_date IS NOT NULL 
        AND sl.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY sl.expiry_date ASC
      LIMIT 1000
    `, [Number(days)]);

    sendCsv(
      res,
      'expiry-report.csv',
      ['Lot Number', 'Product Code', 'Product Name', 'Quantity', 'Expiry Date', 'Supplier', 'Days Until Expiry'],
      rows.map(row => [row.lot_number, row.product_code, row.product_name, row.quantity, row.expiry_date, row.supplier, row.days_until_expiry])
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/supplier-performance
 * Supplier performance report
 */
router.get('/supplier-performance', async (req, res, next) => {
  try {
    const { supplierId } = req.query;
    const params = [];
    let where = '';

    if (supplierId) {
      where = 'WHERE s.id = ?';
      params.push(supplierId);
    }

    const rows = await query(`
      SELECT
        s.id AS supplier_id,
        s.name AS supplier_name,
        s.rating,
        COUNT(DISTINCT po.id) AS total_orders,
        COALESCE(SUM(CASE WHEN po.status IN ('approved', 'completed') THEN 1 ELSE 0 END), 0) AS completed_orders,
        COALESCE(AVG(DATEDIFF(po.expected_delivery_date, po.order_date)), 0) AS avg_lead_time,
        COALESCE(SUM(po.total_amount), 0) AS total_spend,
        MAX(po.order_date) AS last_order_date,
        COALESCE(SUM(CASE WHEN po.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders
      FROM suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id
      ${where}
      GROUP BY s.id, s.name, s.rating
      ORDER BY total_spend DESC, s.name ASC
    `, params);

    res.json(rows.map(row => ({
      supplierId: String(row.supplier_id),
      supplierName: row.supplier_name,
      rating: Number(row.rating || 0),
      totalOrders: Number(row.total_orders || 0),
      completedOrders: Number(row.completed_orders || 0),
      avgLeadTime: Number(row.avg_lead_time || 0),
      totalSpend: Number(row.total_spend || 0),
      lastOrderDate: row.last_order_date || null,
      cancelledOrders: Number(row.cancelled_orders || 0),
      completionRate: row.total_orders > 0 ? (Number(row.completed_orders || 0) / Number(row.total_orders)) * 100 : 0
    })));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /reports/low-stock
 * Low stock report
 */
router.get('/low-stock', async (req, res, next) => {
  try {
    const rows = await query(`
      SELECT
        p.product_code,
        p.product_name,
        COALESCE(c.category_name, 'ไม่ระบุหมวด') AS category,
        ${unitNameExpr} AS unit,
        ${currentStockExpr} AS current_stock,
        COALESCE(sl.min_level, p.min_stock_level, 0) AS min_level,
        COALESCE(sl.max_level, p.max_stock_level, 0) AS max_level,
        COALESCE(sl.reorder_point, p.reorder_point, 0) AS reorder_point,
        COALESCE(p.unit_cost, p.cost_price, 0) AS unit_cost
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${unitJoin}
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      ${lotBalanceJoin}
      WHERE p.is_active = 1
        AND ${currentStockExpr} <= COALESCE(sl.reorder_point, p.reorder_point, 0)
      ORDER BY ${currentStockExpr} ASC
      LIMIT 500
    `);

    res.json(rows.map(row => ({
      productCode: row.product_code,
      productName: row.product_name,
      category: row.category,
      unit: row.unit || '',
      currentStock: Number(row.current_stock || 0),
      minLevel: Number(row.min_level || 0),
      maxLevel: Number(row.max_level || 0),
      reorderPoint: Number(row.reorder_point || 0),
      unitCost: Number(row.unit_cost || 0),
      shortage: Math.max(0, Number(row.reorder_point || 0) - Number(row.current_stock || 0))
    })));
  } catch (error) {
    next(error);
  }
});

module.exports = router;