/**
 * Database Seeding Script for Inventory Phoubon
 * Reads data from Excel file: stock_reserve.xlsx
 * 
 * Usage: node database/seed.js
 */

const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const EXCEL_PATH = process.env.EXCEL_PATH || 'C:\\Users\\DELL\\Downloads\\stock_reserve.xlsx';
const DEFAULT_PASSWORD = 'admin123';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'inventory_phoubon',
    charset: 'utf8mb4',
    multipleStatements: true
  });
}

async function createDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4'
  });

  const dbName = process.env.DB_NAME || 'inventory_phoubon';
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();
  console.log(`✅ Database '${dbName}' created or already exists`);
}

async function readExcelFile() {
  console.log(`📖 Reading Excel file: ${EXCEL_PATH}`);
  
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetNames = workbook.SheetNames;
  console.log(`   Sheets found: ${sheetNames.join(', ')}`);

  // Read table-10 sheet (main product data)
  let table10Data = [];
  if (sheetNames.includes('table-10')) {
    const sheet = workbook.Sheets['table-10'];
    table10Data = XLSX.utils.sheet_to_json(sheet);
    console.log(`   'table-10' sheet: ${table10Data.length} rows`);
  } else {
    console.log(`   ⚠️ Sheet 'table-10' not found`);
  }

  // Read Ubon-Total sheet (stock quantities)
  let ubonTotalData = [];
  if (sheetNames.includes('Ubon-Total')) {
    const sheet = workbook.Sheets['Ubon-Total'];
    ubonTotalData = XLSX.utils.sheet_to_json(sheet);
    console.log(`   'Ubon-Total' sheet: ${ubonTotalData.length} rows`);
  } else {
    console.log(`   ⚠️ Sheet 'Ubon-Total' not found`);
  }

  return { table10Data, ubonTotalData };
}

async function seedCategories(connection, table10Data) {
  console.log('\n📦 Seeding categories...');
  
  const categories = new Set();
  
  // Extract unique categories from data
  table10Data.forEach(row => {
    const category = String(row.Groups || row.groups || row.GROUPS || '').trim();
    if (category) {
      categories.add(category);
    }
  });

  // Add default categories if none found
  if (categories.size === 0) {
    categories.add('ยาเม็ด');
    categories.add('ยาแคปซูล');
    categories.add('ยาน้ำ');
    categories.add('ยาฉีด');
    categories.add('ยาภายนอก');
    categories.add('เวชภัณฑ์');
    categories.add('อื่นๆ');
  }

  const categoryIds = new Map();
  let order = 1;

  for (const categoryName of categories) {
    const [result] = await connection.execute(
      `INSERT INTO categories (category_name, is_active) VALUES (?, 1)
       ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)`,
      [categoryName]
    );
    
    const [rows] = await connection.execute(
      'SELECT id FROM categories WHERE category_name = ?',
      [categoryName]
    );
    
    if (rows[0]) {
      categoryIds.set(categoryName, rows[0].id);
    }
    order++;
  }

  console.log(`   ✅ ${categoryIds.size} categories seeded`);
  return categoryIds;
}

async function seedDrugtypes(connection) {
  console.log('\n💊 Seeding drug types...');
  
  const drugtypes = [
    { code: '01', name: 'ยาแผนปัจจุบัน', sort_order: 1 },
    { code: '02', name: 'หัตถการ/บริการทางการแพทย์', sort_order: 2 },
    { code: '03', name: 'วัสดุการแพทย์/อุปกรณ์', sort_order: 3 },
    { code: '04', name: 'ยาคุมกำเนิด/วางแผนครอบครัว', sort_order: 4 },
    { code: '05', name: 'วัคซีน', sort_order: 5 },
    { code: '06', name: 'บริการคัดกรองสุขภาพ', sort_order: 6 },
    { code: '07', name: 'อื่นๆ', sort_order: 7 },
    { code: '10', name: 'ยาสมุนไพร', sort_order: 8 },
    { code: '11', name: 'ยาแผนไทย/บริการแพทย์แผนไทย', sort_order: 9 }
  ];

  for (const dt of drugtypes) {
    await connection.execute(
      `INSERT INTO drugtypes (drugtype_code, drugtype_name, sort_order, is_active) 
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE drugtype_name = VALUES(drugtype_name), sort_order = VALUES(sort_order)`,
      [dt.code, dt.name, dt.sort_order]
    );
  }

  console.log(`   ✅ ${drugtypes.length} drug types seeded`);
}

async function seedProducts(connection, table10Data, ubonTotalData, categoryIds) {
  console.log('\n📋 Seeding products...');
  
  // Create a map for stock quantities from Ubon-Total
  const stockQtyMap = new Map();
  
  ubonTotalData.forEach(row => {
    // hosp_code or GPUID maps to product_code
    const gpuid = String(row.GPUID || row.hosp_code || row.gpuID || row.GPUID || '').trim();
    const stockQty = Number(row.stock_qty || row.stock_quantity || row.qty || 0);
    
    if (gpuid) {
      stockQtyMap.set(gpuid, stockQty);
    }
  });

  console.log(`   Stock quantities found for ${stockQtyMap.size} products`);

  let productsInserted = 0;
  let productsSkipped = 0;

  for (const row of table10Data) {
    // Extract data from row (handle various column name formats)
    const productCode = String(row.GPUID || row.gpuid || row.GpuID || '').trim();
    const productName = String(row.DrugName || row.drugName || row.drug_name || row.DRUGNAME || row['DRUG NAME'] || '').trim();
    const unit = String(row.DispUnit || row.dispUnit || row.unit || row.UNIT || row.Unit || '').trim();
    const category = String(row.Groups || row.groups || row.GROUPS || row.Group || '').trim();
    const minStock = Number(row.WachtList || row.WatchList || row.watch_list || row.min_stock || 0);

    if (!productCode || !productName) {
      productsSkipped++;
      continue;
    }

    // Get category ID
    const categoryId = categoryIds.get(category) || null;

    // Get stock quantity from Ubon-Total if available
    const stockQty = stockQtyMap.get(productCode) || 0;

    try {
      // Insert product
      await connection.execute(
        `INSERT INTO products (product_code, product_name, category_id, unit_sell, min_stock_level, is_active)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE 
           product_name = VALUES(product_name),
           category_id = VALUES(category_id),
           unit_sell = VALUES(unit_sell),
           min_stock_level = VALUES(min_stock_level)`,
        [productCode, productName, categoryId, unit, minStock]
      );

      // Get product ID
      const [productRows] = await connection.execute(
        'SELECT id FROM products WHERE product_code = ?',
        [productCode]
      );

      if (productRows[0]) {
        const productId = productRows[0].id;

        // Insert/update stock level
        await connection.execute(
          `INSERT INTO stock_levels (product_id, quantity, min_level, reorder_point, last_counted_at)
           VALUES (?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE 
             quantity = VALUES(quantity),
             min_level = VALUES(min_level),
             reorder_point = VALUES(reorder_point),
             updated_at = CURRENT_TIMESTAMP`,
          [productId, stockQty, minStock, minStock]
        );

        // If there's stock quantity, create a stock lot entry
        if (stockQty > 0) {
          await connection.execute(
            `INSERT INTO stock_lots (product_id, lot_number, quantity, original_quantity, supplier, received_date)
             VALUES (?, 'OPENING', ?, ?, 'Opening Balance', NOW())
             ON DUPLICATE KEY UPDATE 
               quantity = VALUES(quantity),
               original_quantity = VALUES(original_quantity)`,
            [productId, stockQty, stockQty]
          );
        }
      }

      productsInserted++;
      
      if (productsInserted % 1000 === 0) {
        console.log(`   Progress: ${productsInserted} products...`);
      }
    } catch (error) {
      console.log(`   ⚠️ Error inserting product ${productCode}: ${error.message}`);
      productsSkipped++;
    }
  }

  console.log(`   ✅ ${productsInserted} products seeded, ${productsSkipped} skipped`);
}

async function seedSuppliers(connection) {
  console.log('\n🏭 Seeding suppliers...');
  
  const suppliers = [
    { code: 'SUP-001', name: 'บริษัท ผู้จำหน่ายยา จำกัด', contact: 'ฝ่ายขาย', phone: '02-xxx-xxxx' },
    { code: 'SUP-002', name: 'บริษัท เวชภัณฑ์ไทย จำกัด', contact: 'ฝ่ายขาย', phone: '02-yyy-yyyy' },
    { code: 'SUP-003', name: 'บริษัท ยาเม็ดไทยแลนด์ จำกัด', contact: 'ฝ่ายขาย', phone: '02-zzz-zzzz' }
  ];

  for (const supplier of suppliers) {
    await connection.execute(
      `INSERT INTO suppliers (code, name, contact_person, phone, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [supplier.code, supplier.name, supplier.contact, supplier.phone]
    );
  }

  console.log(`   ✅ ${suppliers.length} suppliers seeded`);
}

async function seedUsers(connection) {
  console.log('\n👥 Seeding users...');
  
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const users = [
    { username: 'admin', fullName: 'ผู้ดูแลระบบ', role: 'admin', email: 'admin@phoubon.local' },
    { username: 'manager', fullName: 'ผู้จัดการคลัง', role: 'manager', email: 'manager@phoubon.local' },
    { username: 'staff', fullName: 'เจ้าหน้าที่คลัง', role: 'staff', email: 'staff@phoubon.local' }
  ];

  for (const user of users) {
    await connection.execute(
      `INSERT INTO users (username, password_hash, full_name, role, email, is_active)
       VALUES (?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE 
         password_hash = VALUES(password_hash),
         full_name = VALUES(full_name),
         role = VALUES(role)`,
      [user.username, passwordHash, user.fullName, user.role, user.email]
    );
  }

  console.log(`   ✅ ${users.length} users seeded (password: ${DEFAULT_PASSWORD})`);
}

async function runSeed() {
  console.log('==========================================');
  console.log('🌱 Inventory Phoubon Database Seeding');
  console.log('==========================================');

  let connection;

  try {
    // Step 1: Create database
    await createDatabase();

    // Step 2: Read Excel file
    const { table10Data, ubonTotalData } = await readExcelFile();

    // Step 3: Connect to database
    connection = await getConnection();
    console.log('\n✅ Connected to database');

    // Step 4: Run schema (create tables)
    console.log('\n📋 Running schema...');
    const fs = require('fs');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema in parts (split by semicolons for complex statements)
    try {
      await connection.query(schema);
      console.log('   ✅ Schema executed');
    } catch (schemaError) {
      // If multiple statements fail, try executing parts separately
      console.log('   ⚠️ Schema execution warning:', schemaError.message);
    }

    // Step 5: Seed data
    const categoryIds = await seedCategories(connection, table10Data);
    await seedDrugtypes(connection);
    await seedProducts(connection, table10Data, ubonTotalData, categoryIds);
    await seedSuppliers(connection);
    await seedUsers(connection);

    console.log('\n==========================================');
    console.log('✅ Database seeding completed successfully!');
    console.log('==========================================');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };