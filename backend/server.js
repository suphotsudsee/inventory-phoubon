/**
 * Inventory Phoubon - Backend Server
 * ระบบบริหารจัดการคลังเวชภัณฑ์ ภูพาน
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const stockRouter = require('./routes/stock');
const purchaseOrdersRouter = require('./routes/purchase-orders');
const dashboardRouter = require('./routes/dashboard');
const suppliersRouter = require('./routes/suppliers');
const reportsRouter = require('./routes/reports');
const usersRouter = require('./routes/users');
const { isAuthenticated } = require('./middleware/auth');
const { errorHandler } = require('./middleware/error-handler');

const app = express();
const PORT = Number(process.env.PORT) || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'inventory-phoubon-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/products', isAuthenticated, productsRouter);
app.use('/api/stock', isAuthenticated, stockRouter);
app.use('/api/purchase-orders', isAuthenticated, purchaseOrdersRouter);
app.use('/api/dashboard', isAuthenticated, dashboardRouter);
app.use('/api/suppliers', isAuthenticated, suppliersRouter);
app.use('/api/reports', isAuthenticated, reportsRouter);
app.use('/api/users', isAuthenticated, usersRouter);

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'ระบบบริหารจัดการคลังเวชภัณฑ์ ภูพาน',
    version: '1.0.0',
    description: 'Inventory & Procurement Management System for Phoubon Hospital',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      stock: '/api/stock',
      'purchase-orders': '/api/purchase-orders',
      dashboard: '/api/dashboard',
      suppliers: '/api/suppliers',
      reports: '/api/reports',
      users: '/api/users',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🏥 Inventory Phoubon API listening on http://localhost:${PORT}`);
  console.log(`📦 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
