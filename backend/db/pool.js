/**
 * MySQL connection pool for Inventory Phoubon
 * Single-tenant connection pool
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory_phoubon',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
    
    // Test connection
    try {
      const connection = await pool.getConnection();
      console.log('✅ Database connected successfully');
      connection.release();
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }
  return pool;
}

/**
 * Execute a query with automatic connection handling
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} - Query results
 */
async function query(sql, params = []) {
  const connection = await getPool();
  const [rows] = await connection.execute(sql, params);
  return rows;
}

/**
 * Get a connection from the pool for transactions
 * @returns {Promise<Connection>}
 */
async function getConnection() {
  const currentPool = await getPool();
  return await currentPool.getConnection();
}

/**
 * Begin a transaction
 * @param {Connection} connection 
 */
async function beginTransaction(connection) {
  await connection.beginTransaction();
}

/**
 * Commit a transaction
 * @param {Connection} connection 
 */
async function commit(connection) {
  await connection.commit();
}

/**
 * Rollback a transaction
 * @param {Connection} connection 
 */
async function rollback(connection) {
  await connection.rollback();
}

/**
 * Release connection back to pool
 * @param {Connection} connection 
 */
function releaseConnection(connection) {
  connection.release();
}

/**
 * Close the pool (for graceful shutdown)
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}

module.exports = {
  pool,
  query,
  getConnection,
  beginTransaction,
  commit,
  rollback,
  releaseConnection,
  closePool,
  getPool
};