/**
 * Users Routes for Inventory Phoubon
 * User management
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { isAuthenticated, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(isAuthenticated);

function mapUser(row) {
  return {
    id: String(row.id),
    username: row.username,
    email: row.email || '',
    fullName: row.full_name || '',
    role: row.role,
    isActive: Boolean(row.is_active),
    lastLogin: row.last_login || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ROLE_PERMISSIONS = {
  admin: ['*'],
  manager: ['products:read', 'products:write', 'stock:read', 'stock:write', 'stock:adjust',
             'purchase-orders:read', 'purchase-orders:write', 'purchase-orders:approve',
             'suppliers:read', 'suppliers:write', 'reports:read', 'dashboard:read'],
  staff: ['products:read', 'stock:read', 'stock:write', 'purchase-orders:read', 'purchase-orders:write',
          'suppliers:read', 'dashboard:read'],
  viewer: ['products:read', 'stock:read', 'purchase-orders:read', 'dashboard:read'],
};

router.get('/roles', (req, res) => {
  res.json(Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({ role, permissions })));
});

router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC'
    );
    res.json(rows.map(mapUser));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(mapUser(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { username, password, email, fullName, role = 'staff' } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const existing = await query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing[0]) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await query(
      `INSERT INTO users (username, password_hash, email, full_name, role, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [username, passwordHash, email || '', fullName || username, role]
    );

    const rows = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(mapUser(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { username, email, fullName, role, isActive, password } = req.body;
    const updates = [];
    const params = [];

    if (username) { updates.push('username = ?'); params.push(username); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (fullName) { updates.push('full_name = ?'); params.push(fullName); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    if (!updates.length) return res.status(400).json({ message: 'No fields to update' });

    params.push(req.params.id);
    await query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);

    const rows = await query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(mapUser(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const rows = await query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });

    await query('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
