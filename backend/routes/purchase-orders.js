/**
 * Purchase Orders Routes for Inventory Phoubon
 * CRUD operations for purchase orders
 */

const express = require('express');
const { pool, query, getConnection, beginTransaction, commit, rollback, releaseConnection } = require('../db/pool');
const { isAuthenticated } = require('../middleware/auth');
const { lotBalanceJoin, currentStockExpr } = require('../utils/stock-balance');
const { unitJoin, unitNameExpr } = require('../utils/unit-name');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

const DEFAULT_USER_ID = 1;

/**
 * Map status for display
 */
function mapStatus(status) {
  switch (status) {
    case 'approved': return 'ordered';
    case 'completed': return 'received';
    default: return status;
  }
}

/**
 * Load orders with items
 */
async function loadOrders(where = '', params = []) {
  const orders = await query(
    `SELECT po.*, s.name AS supplier_name
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     ${where ? 'WHERE ' + where : ''}
     ORDER BY po.created_at DESC`,
    params
  );

  if (!orders.length) return [];

  const items = await query(
    `SELECT poi.*, p.product_code, p.product_name, ${unitNameExpr} AS unit
     FROM purchase_order_items poi
     JOIN products p ON p.id = poi.product_id
     ${unitJoin}
     WHERE poi.order_id IN (${orders.map(() => '?').join(',')})
     ORDER BY poi.id ASC`,
    orders.map(o => o.id)
  );

  const itemsByOrder = items.reduce((acc, item) => {
    const key = String(item.order_id);
    acc[key] = acc[key] || [];
    acc[key].push({
      productId: item.product_code,
      productName: item.product_name,
      quantity: Number(item.quantity || 0),
      unit: item.unit || '',
      unitPrice: Number(item.unit_price || 0),
      totalPrice: Number(item.total_price || 0),
      notes: item.notes || ''
    });
    return acc;
  }, {});

  return orders.map(order => ({
    id: String(order.id),
    orderNumber: order.order_number,
    supplierId: String(order.supplier_id),
    supplierName: order.supplier_name,
    orderDate: order.order_date,
    expectedDate: order.expected_delivery_date,
    status: mapStatus(order.status),
    items: itemsByOrder[String(order.id)] || [],
    totalAmount: Number(order.total_amount || 0),
    notes: order.notes || '',
    approvedBy: order.approved_by ? String(order.approved_by) : '',
    approvedDate: order.approved_at,
    createdAt: order.created_at
  }));
}

/**
 * GET /purchase-orders
 * List purchase orders
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, supplierId } = req.query;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('po.status = ?');
      params.push(status === 'ordered' ? 'approved' : status === 'received' ? 'completed' : status);
    }

    if (supplierId) {
      conditions.push('po.supplier_id = ?');
      params.push(supplierId);
    }

    const where = conditions.length ? conditions.join(' AND ') : '';
    res.json(await loadOrders(where, params));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /purchase-orders/:id
 * Get purchase order by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const orders = await loadOrders('po.id = ?', [req.params.id]);
    if (!orders[0]) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }
    res.json(orders[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new purchase order
 */
async function createOrder({ supplierId, expectedDate, items = [], notes = '' }) {
  // Get supplier
  const suppliers = await query('SELECT id, name FROM suppliers WHERE id = ? AND is_active = 1 LIMIT 1', [supplierId]);
  if (!suppliers[0]) {
    throw new Error('Supplier not found');
  }

  const supplier = suppliers[0];

  // Generate order number
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM purchase_orders WHERE DATE(created_at) = CURDATE()');
  const orderNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Number(total || 0) + 1).padStart(4, '0')}`;

  const totalAmount = items.reduce((sum, item) => sum + Number(item.totalPrice || item.quantity * item.unitPrice || 0), 0);

  const result = await query(
    `INSERT INTO purchase_orders (
      order_number, supplier_id, status, total_amount, order_date, expected_delivery_date, notes, created_by
    ) VALUES (?, ?, 'pending', ?, CURDATE(), ?, ?, ?)`,
    [orderNumber, Number(supplierId), totalAmount, expectedDate, notes, DEFAULT_USER_ID]
  );

  const orderId = result.insertId;

  for (const item of items) {
    // Find product
    const [product] = await query(
      'SELECT id, product_code FROM products WHERE product_code = ? OR id = ? LIMIT 1',
      [item.productId, Number(item.productId) || 0]
    );

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    await query(
      `INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price, total_price, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, product.id, item.quantity, item.unitPrice, item.totalPrice || item.quantity * item.unitPrice, item.notes || null]
    );
  }

  const orders = await loadOrders('po.id = ?', [orderId]);
  return orders[0];
}

/**
 * POST /purchase-orders
 * Create a new purchase order
 */
router.post('/', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const { supplierId, expectedDate, items = [], notes = '' } = req.body;

    if (!supplierId || !expectedDate || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Supplier, expected date, and items are required'
      });
    }

    await beginTransaction(connection);

    // Get supplier
    const [supplierRows] = await connection.execute(
      'SELECT id, name FROM suppliers WHERE id = ? AND is_active = 1 LIMIT 1',
      [supplierId]
    );

    if (!supplierRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Generate order number
    const [[countRow]] = await connection.query(
      'SELECT COUNT(*) AS total FROM purchase_orders WHERE DATE(created_at) = CURDATE()'
    );
    const orderNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Number(countRow.total || 0) + 1).padStart(4, '0')}`;

    const totalAmount = items.reduce((sum, item) => sum + Number(item.totalPrice || item.quantity * item.unitPrice || 0), 0);

    const [orderResult] = await connection.execute(
      `INSERT INTO purchase_orders (order_number, supplier_id, status, total_amount, order_date, expected_delivery_date, notes, created_by)
       VALUES (?, ?, 'pending', ?, CURDATE(), ?, ?, ?)`,
      [orderNumber, Number(supplierId), totalAmount, expectedDate, notes, req.user.id]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      // Find product
      const [productRows] = await connection.execute(
        'SELECT id, product_code FROM products WHERE product_code = ? OR id = ? LIMIT 1',
        [item.productId, Number(item.productId) || 0]
      );

      if (!productRows[0]) {
        await rollback(connection);
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      await connection.execute(
        `INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price, total_price, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, productRows[0].id, item.quantity, item.unitPrice, item.totalPrice || item.quantity * item.unitPrice, item.notes || null]
      );
    }

    await commit(connection);

    const orders = await loadOrders('po.id = ?', [orderId]);
    res.status(201).json(orders[0]);
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

/**
 * POST /purchase-orders/from-low-stock
 * Generate purchase order from low stock products
 */
router.post('/from-low-stock', async (req, res, next) => {
  try {
    // Get first active supplier
    const suppliers = await query('SELECT id, name FROM suppliers WHERE is_active = 1 ORDER BY name ASC LIMIT 1');
    if (!suppliers[0]) {
      return res.status(400).json({
        success: false,
        message: 'No active supplier found'
      });
    }

    // Get low stock products
    const lowStockProducts = await query(`
      SELECT
        p.product_code,
        p.product_name,
        ${unitNameExpr} AS unit,
        COALESCE(p.unit_cost, p.cost_price, 0) AS unit_cost,
        ${currentStockExpr} AS current_stock,
        COALESCE(sl.max_level, p.max_stock_level, 0) AS max_level,
        COALESCE(sl.reorder_point, p.reorder_point, 0) AS reorder_point
      FROM products p
      ${unitJoin}
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      ${lotBalanceJoin}
      WHERE p.is_active = 1
        AND ${currentStockExpr} <= COALESCE(sl.reorder_point, p.reorder_point, 0)
      ORDER BY ${currentStockExpr} ASC
      LIMIT 20
    `);

    if (!lowStockProducts.length) {
      return res.status(400).json({
        success: false,
        message: 'No low stock products found'
      });
    }

    const expectedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const order = await createOrder({
      supplierId: String(suppliers[0].id),
      expectedDate,
      items: lowStockProducts.map(product => {
        const quantity = Math.max(
          Number(product.max_level || 0) - Number(product.current_stock || 0),
          Number(product.reorder_point || 1)
        );
        return {
          productId: product.product_code,
          productName: product.product_name,
          quantity,
          unit: product.unit || '',
          unitPrice: Number(product.unit_cost || 0),
          totalPrice: quantity * Number(product.unit_cost || 0)
        };
      }),
      notes: 'Generated from low stock items'
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /purchase-orders/:id
 * Update purchase order
 */
router.put('/:id', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const { expectedDate, status, notes } = req.body;

    // Check order exists
    const [orderRows] = await connection.execute(
      'SELECT id, status FROM purchase_orders WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!orderRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    const updates = [];
    const params = [];

    if (expectedDate !== undefined) {
      updates.push('expected_delivery_date = ?');
      params.push(expectedDate);
    }

    if (status !== undefined) {
      const dbStatus = status === 'ordered' ? 'approved' : status === 'received' ? 'completed' : status;
      updates.push('status = ?');
      params.push(dbStatus);

      if (dbStatus === 'approved') {
        updates.push('approved_by = ?');
        params.push(req.user.id);
        updates.push('approved_at = NOW()');
      }
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (!updates.length) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(req.params.id);

    await beginTransaction(connection);
    await connection.execute(
      `UPDATE purchase_orders SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    // If approved, log to approvals table
    if (status === 'approved') {
      await connection.execute(
        `INSERT INTO purchase_order_approvals (order_id, approved_by, approved_at, notes)
         VALUES (?, ?, NOW(), ?)`,
        [req.params.id, req.user.id, notes || 'Approved']
      );
    }

    await commit(connection);

    const orders = await loadOrders('po.id = ?', [req.params.id]);
    res.json(orders[0]);
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

/**
 * DELETE /purchase-orders/:id
 * Delete purchase order (soft delete - set to cancelled)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const orderRows = await query('SELECT id, status FROM purchase_orders WHERE id = ? LIMIT 1', [req.params.id]);
    if (!orderRows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (orderRows[0].status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed order'
      });
    }

    await query('UPDATE purchase_orders SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Order cancelled' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;