/**
 * Authentication Routes for Inventory Phoubon
 * Handles login, logout, and user info
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query, getConnection, beginTransaction, commit, rollback, releaseConnection } = require('../db/pool');
const { isAuthenticated } = require('../middleware/auth');
const { ROLE_PERMISSIONS } = require('../utils/rbac');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'phoubon_secret_key_2026';
const JWT_EXPIRES_IN = '7d';

/**
 * Map user row to response object
 */
function mapUser(row) {
  const role = String(row.role || 'staff');
  return {
    id: String(row.id),
    username: row.username,
    fullName: row.full_name || '',
    email: row.email || '',
    role,
    permissions: ROLE_PERMISSIONS[role] || [],
    active: Boolean(row.is_active),
    lastLogin: row.last_login || null
  };
}

/**
 * POST /auth/login
 * Login with username and password
 */
router.post('/login', async (req, res, next) => {
  const connection = await getConnection();
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '').trim();

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user
    const rows = await query(
      `SELECT id, username, password_hash, email, full_name, role, is_active, last_login
       FROM users WHERE username = ? LIMIT 1`,
      [username]
    );

    if (!rows[0] || !rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const user = rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Update last login
    await connection.execute(
      'UPDATE users SET last_login = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || []
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      success: true,
      token,
      user: mapUser(user)
    });
  } catch (error) {
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

/**
 * POST /auth/logout
 * Logout (client-side token removal)
 */
router.post('/logout', isAuthenticated, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', isAuthenticated, async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, username, email, full_name, role, is_active, last_login
       FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: mapUser(rows[0])
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/change-password
 * Change password for current user
 */
router.post('/change-password', isAuthenticated, async (req, res, next) => {
  const connection = await getConnection();
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get current user
    const rows = await query(
      'SELECT password_hash FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    await beginTransaction(connection);
    await connection.execute(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newHash, req.user.id]
    );
    await commit(connection);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    await rollback(connection);
    next(error);
  } finally {
    releaseConnection(connection);
  }
});

module.exports = router;