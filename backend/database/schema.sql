/**
 * Database Schema for Inventory Phoubon
 * Hospital Drug Inventory & Procurement System (Single Tenant)
 * MySQL Database Schema
 */

-- ============================================
-- Categories (หมวดหมู่ยา)
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category_name (category_name),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Drug Types (ประเภทยา)
-- ============================================

CREATE TABLE IF NOT EXISTS drugtypes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drugtype_code VARCHAR(10) NOT NULL UNIQUE,
  drugtype_name VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_drugtype_code (drugtype_code),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Products (รายการยาและเวชภัณฑ์)
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255) NULL,
  category_id INT NULL,
  drugtype_code VARCHAR(10) NULL,
  unit_sell VARCHAR(50) NULL,
  min_stock_level INT DEFAULT 0,
  max_stock_level INT DEFAULT 0,
  reorder_point INT DEFAULT 0,
  cost_price DECIMAL(15, 2) DEFAULT 0.00,
  unit_cost DECIMAL(15, 2) DEFAULT 0.00,
  barcode VARCHAR(100) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_product_code (product_code),
  INDEX idx_product_name (product_name),
  INDEX idx_category (category_id),
  INDEX idx_drugtype (drugtype_code),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Stock Levels (ระดับสต็อกปัจจุบัน)
-- ============================================

CREATE TABLE IF NOT EXISTS stock_levels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  quantity INT DEFAULT 0,
  min_level INT DEFAULT 0,
  max_level INT DEFAULT 0,
  reorder_point INT DEFAULT 0,
  last_counted_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stock_levels_product (product_id),
  CONSTRAINT fk_stock_levels_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Stock Lots (Lot ยา - รับเข้าแยกตาม Lot)
-- ============================================

CREATE TABLE IF NOT EXISTS stock_lots (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  lot_number VARCHAR(100) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  original_quantity INT NOT NULL DEFAULT 0,
  expiry_date DATE NULL,
  supplier VARCHAR(255) NULL,
  unit_price DECIMAL(15, 2) DEFAULT 0.00,
  received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_lots_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_product (product_id),
  INDEX idx_lot_number (lot_number),
  INDEX idx_expiry (expiry_date),
  INDEX idx_quantity (quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Stock Movements (ประวัติการเคลื่อนไหวสต็อก)
-- ============================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('receipt', 'deduct', 'adjust', 'transfer_in', 'transfer_out') NOT NULL,
  product_id INT NOT NULL,
  lot_id BIGINT NULL,
  quantity INT NOT NULL,
  previous_stock INT NULL,
  new_stock INT NULL,
  notes TEXT NULL,
  user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_lot FOREIGN KEY (lot_id) REFERENCES stock_lots(id) ON DELETE SET NULL,
  INDEX idx_type (type),
  INDEX idx_product (product_id),
  INDEX idx_lot (lot_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Stock Adjustments (บันทึกการปรับปรุงสต็อก)
-- ============================================

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  lot_id BIGINT NULL,
  adjustment_type ENUM('increase', 'decrease') NOT NULL,
  quantity INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  reason TEXT NOT NULL,
  user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_adjustments_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_adjustments_lot FOREIGN KEY (lot_id) REFERENCES stock_lots(id) ON DELETE SET NULL,
  INDEX idx_product (product_id),
  INDEX idx_type (adjustment_type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Suppliers (ผู้จำหน่าย)
-- ============================================

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  address TEXT NULL,
  tax_id VARCHAR(50) NULL,
  payment_terms VARCHAR(100) NULL,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_name (name),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Purchase Orders (ใบสั่งซื้อ)
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id INT NOT NULL,
  status ENUM('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'draft',
  total_amount DECIMAL(15, 2) DEFAULT 0.00,
  order_date DATE NULL,
  expected_delivery_date DATE NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  notes TEXT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchase_orders_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  INDEX idx_order_number (order_number),
  INDEX idx_status (status),
  INDEX idx_supplier (supplier_id),
  INDEX idx_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Purchase Order Items (รายการในใบสั่งซื้อ)
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,
  notes TEXT NULL,
  CONSTRAINT fk_po_items_order FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_order (order_id),
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Purchase Order Approvals (ประวัติการอนุมัติ)
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_order_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  CONSTRAINT fk_po_approvals_order FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Users (ผู้ใช้งานระบบ)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  full_name VARCHAR(255) NULL,
  role ENUM('admin', 'manager', 'staff', 'viewer') DEFAULT 'staff',
  is_active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Views for Reporting
-- ============================================

-- View: Product Stock Status
CREATE OR REPLACE VIEW v_product_stock_status AS
SELECT 
  p.id,
  p.product_code AS code,
  p.product_name AS name,
  p.generic_name,
  COALESCE(c.category_name, 'ไม่ระบุหมวด') AS category,
  COALESCE(dt.drugtype_name, 'ไม่ระบุประเภท') AS drugtype,
  p.unit_sell AS unit,
  COALESCE(sl.quantity, 0) AS current_stock,
  COALESCE(sl.min_level, p.min_stock_level, 0) AS min_level,
  COALESCE(sl.max_level, p.max_stock_level, 0) AS max_level,
  COALESCE(sl.reorder_point, p.reorder_point, 0) AS reorder_point,
  COALESCE(p.unit_cost, p.cost_price, 0) AS unit_cost,
  COALESCE(sl.quantity, 0) * COALESCE(p.unit_cost, p.cost_price, 0) AS stock_value,
  CASE 
    WHEN COALESCE(sl.quantity, 0) = 0 THEN 'out_of_stock'
    WHEN COALESCE(sl.quantity, 0) < COALESCE(sl.reorder_point, p.reorder_point, 0) THEN 'low_stock'
    ELSE 'normal'
  END AS stock_status,
  (SELECT COUNT(*) FROM stock_lots sl2 WHERE sl2.product_id = p.id AND sl2.quantity > 0) AS batch_count,
  (SELECT MIN(sl2.expiry_date) FROM stock_lots sl2 WHERE sl2.product_id = p.id AND sl2.quantity > 0) AS earliest_expiry
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN drugtypes dt ON dt.drugtype_code = p.drugtype_code AND dt.is_active = 1
LEFT JOIN stock_levels sl ON sl.product_id = p.id
WHERE p.is_active = 1;

-- View: Expiring Stock
CREATE OR REPLACE VIEW v_expiring_stock AS
SELECT 
  sl.id AS lot_id,
  sl.lot_number,
  p.id AS product_id,
  p.product_code,
  p.product_name,
  COALESCE(c.category_name, 'ไม่ระบุหมวด') AS category,
  sl.quantity,
  sl.expiry_date,
  DATEDIFF(sl.expiry_date, CURDATE()) AS days_until_expiry,
  CASE 
    WHEN sl.expiry_date < CURDATE() THEN 'expired'
    WHEN DATEDIFF(sl.expiry_date, CURDATE()) <= 30 THEN 'critical'
    WHEN DATEDIFF(sl.expiry_date, CURDATE()) <= 90 THEN 'warning'
    ELSE 'ok'
  END AS expiry_status
FROM stock_lots sl
JOIN products p ON sl.product_id = p.id
LEFT JOIN categories c ON c.id = p.category_id
WHERE sl.quantity > 0
ORDER BY sl.expiry_date ASC;

-- ============================================
-- Stored Procedures
-- ============================================

DELIMITER //

-- Procedure: Get Low Stock Products
CREATE PROCEDURE IF NOT EXISTS sp_get_low_stock_products()
BEGIN
  SELECT 
    p.id,
    p.product_code AS code,
    p.product_name AS name,
    COALESCE(c.category_name, 'ไม่ระบุหมวด') AS category,
    COALESCE(sl.quantity, 0) AS current_stock,
    COALESCE(sl.min_level, p.min_stock_level, 0) AS min_level,
    COALESCE(sl.reorder_point, p.reorder_point, 0) AS reorder_point,
    COALESCE(sl.reorder_point, p.reorder_point, 0) - COALESCE(sl.quantity, 0) AS shortage
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN stock_levels sl ON sl.product_id = p.id
  WHERE p.is_active = 1
    AND COALESCE(sl.quantity, 0) < COALESCE(sl.reorder_point, p.reorder_point, 0)
  ORDER BY shortage DESC;
END //

-- Procedure: Deduct Stock with FEFO (First Expiry First Out)
CREATE PROCEDURE IF NOT EXISTS sp_deduct_stock_fefo(
  IN p_product_id INT,
  IN p_quantity INT,
  IN p_user_id INT,
  IN p_notes TEXT
)
BEGIN
  DECLARE v_previous_stock INT;
  DECLARE v_remaining INT;
  DECLARE v_lot_id BIGINT;
  DECLARE v_lot_qty INT;
  DECLARE v_deduct_qty INT;
  
  -- Get current stock
  SELECT COALESCE(quantity, 0) INTO v_previous_stock
  FROM stock_levels WHERE product_id = p_product_id;
  
  IF v_previous_stock < p_quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
  END IF;
  
  SET v_remaining = p_quantity;
  
  -- Deduct from lots (FEFO)
  WHILE v_remaining > 0 DO
    SELECT id, quantity INTO v_lot_id, v_lot_qty
    FROM stock_lots
    WHERE product_id = p_product_id
      AND quantity > 0
      AND (expiry_date IS NULL OR expiry_date >= CURDATE())
    ORDER BY 
      CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
      expiry_date ASC,
      received_date ASC
    LIMIT 1;
    
    SET v_deduct_qty = LEAST(v_lot_qty, v_remaining);
    
    UPDATE stock_lots 
    SET quantity = quantity - v_deduct_qty
    WHERE id = v_lot_id;
    
    -- Log movement
    INSERT INTO stock_movements (type, product_id, lot_id, quantity, previous_stock, new_stock, notes, user_id, created_at)
    VALUES ('deduct', p_product_id, v_lot_id, v_deduct_qty, v_previous_stock, v_previous_stock - v_deduct_qty, p_notes, p_user_id, NOW());
    
    SET v_remaining = v_remaining - v_deduct_qty;
    SET v_previous_stock = v_previous_stock - v_deduct_qty;
  END WHILE;
  
  -- Update stock level
  UPDATE stock_levels 
  SET quantity = quantity - p_quantity,
      updated_at = CURRENT_TIMESTAMP
  WHERE product_id = p_product_id;
END //

DELIMITER ;

-- ============================================
-- Additional Performance Indexes
-- ============================================

CREATE INDEX idx_product_category_active ON products(category_id, is_active);
CREATE INDEX idx_stock_lot_product_expiry ON stock_lots(product_id, expiry_date);
CREATE INDEX idx_po_status_date ON purchase_orders(status, order_date);

CREATE TABLE IF NOT EXISTS table10_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gpuid VARCHAR(50) NOT NULL,
  drug_name VARCHAR(255) NOT NULL,
  disp_unit VARCHAR(50) NULL,
  drug_group VARCHAR(255) NULL,
  service_plan VARCHAR(255) NULL,
  wacht_list VARCHAR(100) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_table10_items_gpuid (gpuid),
  INDEX idx_table10_items_name (drug_name),
  INDEX idx_table10_items_group (drug_group),
  INDEX idx_table10_items_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
