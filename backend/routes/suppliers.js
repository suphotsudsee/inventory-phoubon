/**
 * Suppliers Routes for Inventory Phoubon
 * CRUD operations for suppliers
 */

const express = require('express');
const { pool, query, getConnection, beginTransaction, commit, rollback, releaseConnection } = require('../db/pool');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(isAuthenticated);

/**
 * Map supplier row to response object
 */
function mapSupplier(row) {
  return {
    id: String(row.id),
    code: row.code,
    name: row.name,
    contactPerson: row.contact_person || '',
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    taxId: row.tax_id || '',
    paymentTerms: row.payment_terms || '',
    rating: Number(row.rating || 0),
    active: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * GET /suppliers
 * List all suppliers
 */
router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT * FROM suppliers ORDER BY is_active DESC, name ASC'
    );
    res.json(rows.map(mapSupplier));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /suppliers/performance
 * Get supplier performance statistics
 */
router.get('/performance', async (req, res, next) => {
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
        COUNT(DISTINCT po.id) AS total_orders,
        COALESCE(SUM(CASE WHEN po.status IN ('approved', 'completed') THEN 1 ELSE 0 END), 0) AS on_time_delivery,
        COALESCE(AVG(s.rating), 0) AS quality_score,
        COALESCE(AVG(DATEDIFF(po.expected_delivery_date, po.order_date)), 0) AS avg_lead_time,
        COALESCE(SUM(po.total_amount), 0) AS total_spend,
        MAX(po.order_date) AS last_order_date,
        COALESCE(SUM(CASE WHEN po.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS issues
      FROM suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id
      ${where}
      GROUP BY s.id, s.name, s.rating
      ORDER BY total_spend DESC, s.name ASC
    `, params);

    res.json(rows.map(row => ({
      supplierId: String(row.supplier_id),
      supplierName: row.supplier_name,
      totalOrders: Number(row.total_orders || 0),
      onTimeDelivery: Number(row.on_time_delivery || 0),
      qualityScore: Number(row.quality_score || 0),
      avgLeadTime: Number(row.avg_lead_time || 0),
      totalSpend: Number(row.total_spend || 0),
      lastOrderDate: row.last_order_date || null,
      issues: Number(row.issues || 0)
    })));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /suppliers/:id
 * Get supplier by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    res.json(mapSupplier(rows[0]));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /suppliers
 * Create a new supplier
 */
router.post('/', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const {
      name,
      contactPerson = '',
      email = '',
      phone = '',
      address = '',
      taxId = '',
      paymentTerms = 'NET30',
      rating = 5,
      active = true
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }

    // Generate supplier code
    const [{ total }] = await query('SELECT COUNT(*) AS total FROM suppliers');
    const code = `SUP-${String(Number(total || 0) + 1).padStart(4, '0')}`;

    await beginTransaction(connection);

    const [result] = await connection.execute(
      `INSERT INTO suppliers (code, name, contact_person, email, phone, address, tax_id, payment_terms, rating, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, name, contactPerson, email, phone, address, taxId, paymentTerms, rating, active ? 1 : 0]
    );

    await commit(connection);

    const rows = await query('SELECT * FROM suppliers WHERE id = ?', [result.insertId]);
    res.status(201).json(mapSupplier(rows[0]));
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

/**
 * PUT /suppliers/:id
 * Update supplier
 */
router.put('/:id', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const fields = [
      ['name', 'name'],
      ['contactPerson', 'contact_person'],
      ['email', 'email'],
      ['phone', 'phone'],
      ['address', 'address'],
      ['taxId', 'tax_id'],
      ['paymentTerms', 'payment_terms'],
      ['rating', 'rating'],
      ['active', 'is_active']
    ];

    const updates = [];
    const params = [];

    fields.forEach(([input, column]) => {
      if (req.body[input] !== undefined) {
        updates.push(`${column} = ?`);
        params.push(input === 'active' ? (req.body[input] ? 1 : 0) : req.body[input]);
      }
    });

    if (!updates.length) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(req.params.id);

    await beginTransaction(connection);
    await connection.execute(
      `UPDATE suppliers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );
    await commit(connection);

    const rows = await query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json(mapSupplier(rows[0]));
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

/**
 * DELETE /suppliers/:id
 * Soft delete supplier
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const rows = await query('SELECT id FROM suppliers WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Check if supplier has orders
    const orders = await query('SELECT COUNT(*) AS total FROM purchase_orders WHERE supplier_id = ?', [req.params.id]);
    if (Number(orders[0].total || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier with existing orders. Deactivate instead.'
      });
    }

    await query('UPDATE suppliers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Supplier deactivated' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;