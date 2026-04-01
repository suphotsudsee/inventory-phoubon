# 🔌 API Documentation
# ระบบบริหารจัดการคลังเวชภัณฑ์ ภูพาน

> API Reference สำหรับนักพัฒนา

---

## 📑 สารบัญ

- [ภาพรวม](#ภาพรวม)
- [Authentication](#authentication)
- [Products API](#products-api)
- [Stock API](#stock-api)
- [Purchase Orders API](#purchase-orders-api)
- [Suppliers API](#suppliers-api)
- [Dashboard API](#dashboard-api)
- [Reports API](#reports-api)
- [Users API](#users-api)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## 📊 ภาพรวม

### Base URL

```
Development: http://localhost:3002/api
Production:   http://your-domain.com/api
```

### Response Format

ทุก API endpoint จะ return JSON ในรูปแบบ:

```json
{
  "success": true|false,
  "data": { ... },
  "message": "Success message",
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### HTTP Methods

| Method | การใช้งาน |
|--------|----------|
| `GET` | ดึงข้อมูล |
| `POST` | สร้างข้อมูลใหม่ |
| `PUT` | แก้ไขข้อมูล |
| `DELETE` | ลบข้อมูล (soft delete) |

### HTTP Status Codes

| Status Code | ความหมาย |
|-------------|----------|
| `200` | OK - สำเร็จ |
| `201` | Created - สร้างสำเร็จ |
| `400` | Bad Request - ข้อมูลไม่ถูกต้อง |
| `401` | Unauthorized - ไม่ได้ล็อกอิน |
| `403` | Forbidden - ไม่มีสิทธิ์ |
| `404` | Not Found - ไม่พบข้อมูล |
| `500` | Internal Server Error |

---

## 🔐 Authentication

### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "full_name": "System Administrator"
    }
  },
  "message": "Login successful"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

### Logout

```http
POST /api/auth/logout
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Authorization Header

สำหรับทุก request ที่ต้องการ authentication:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📦 Products API

### GET /api/products

ดึงรายการสินค้าทั้งหมด

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | กรองตามหมวดหมู่ |
| `search` | string | - | ค้นหาจากชื่อหรือโค้ด |
| `page` | number | 1 | หน้าที่ต้องการ |
| `limit` | number | 50 | จำนวนรายการต่อหน้า (max: 100) |
| `show_inactive` | boolean | false | แสดงรายการที่ inactive |

**Example Request:**
```http
GET /api/products?category=Medicine&search=para&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "DRUG001",
      "name": "Paracetamol 500mg",
      "category": "Medicine",
      "unit": "Tablet",
      "min_stock": 1000,
      "current_stock": 15000,
      "unit_price": 0.50,
      "description": "Pain reliever and fever reducer",
      "is_active": true,
      "created_at": "2026-01-15T10:30:00.000Z",
      "updated_at": "2026-03-28T14:20:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 11847,
    "totalPages": 593
  }
}
```

---

### GET /api/products/:id

ดึงข้อมูลสินค้าตาม ID

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Product ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "DRUG001",
    "name": "Paracetamol 500mg",
    "category": "Medicine",
    "unit": "Tablet",
    "min_stock": 1000,
    "current_stock": 15000,
    "unit_price": 0.50,
    "description": "Pain reliever and fever reducer",
    "is_active": true,
    "batches": [
      {
        "id": 1,
        "batch_number": "LOT2026-001",
        "quantity": 10000,
        "expiry_date": "2027-12-31",
        "supplier": "ABC Pharma"
      }
    ],
    "created_at": "2026-01-15T10:30:00.000Z",
    "updated_at": "2026-03-28T14:20:00.000Z"
  }
}
```

---

### POST /api/products

สร้างสินค้าใหม่

**Required Permission:** `products:write` (Admin, Manager)

**Request Body:**
```json
{
  "code": "DRUG003",
  "name": "Ibuprofen 400mg",
  "category": "Medicine",
  "unit": "Tablet",
  "min_stock": 500,
  "unit_price": 1.25,
  "description": "Nonsteroidal anti-inflammatory drug"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": 3,
    "code": "DRUG003",
    "name": "Ibuprofen 400mg",
    "category": "Medicine",
    "unit": "Tablet",
    "min_stock": 500,
    "current_stock": 0,
    "unit_price": 1.25,
    "description": "Nonsteroidal anti-inflammatory drug",
    "is_active": true,
    "created_at": "2026-03-31T10:00:00.000Z"
  }
}
```

---

### PUT /api/products/:id

แก้ไขข้อมูลสินค้า

**Required Permission:** `products:write` (Admin, Manager)

**Request Body:**
```json
{
  "name": "Paracetamol 500mg (Updated)",
  "min_stock": 2000,
  "unit_price": 0.55
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": 1,
    "code": "DRUG001",
    "name": "Paracetamol 500mg (Updated)",
    "min_stock": 2000,
    "unit_price": 0.55
  }
}
```

---

### DELETE /api/products/:id

ลบสินค้า (Soft Delete - ตั้ง is_active = false)

**Required Permission:** `products:write` (Admin only)

**Response:**
```json
{
  "success": true,
  "message": "Product \"Paracetamol 500mg\" has been deactivated"
}
```

---

## 📦 Stock API

### POST /api/stock/receipt

รับเข้าสินค้า

**Required Permission:** `stock:write` (Admin, Manager, Staff)

**Request Body:**
```json
{
  "product_id": 1,
  "batch_number": "LOT2026-001",
  "quantity": 5000,
  "expiry_date": "2027-12-31",
  "supplier": "ABC Pharma Ltd.",
  "unit_price": 0.48,
  "notes": "รับเข้าจากการสั่งซื้อ PO-20260331-0001"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Stock received successfully",
  "data": {
    "batch_id": 42,
    "product_id": 1,
    "product_name": "Paracetamol 500mg",
    "batch_number": "LOT2026-001",
    "quantity_received": 5000,
    "expiry_date": "2027-12-31",
    "previous_stock": 10000,
    "new_stock": 15000,
    "transaction_id": 1001
  }
}
```

---

### POST /api/stock/deduct

ตัดสต็อก (ใช้ FEFO อัตโนมัติ)

**Required Permission:** `stock:write` (Admin, Manager, Staff)

**Request Body:**
```json
{
  "product_id": 1,
  "quantity": 1000,
  "reason": "จ่ายให้ผู้ป่วย OPD",
  "notes": "HN: 123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock deducted successfully (FEFO applied)",
  "data": {
    "product_id": 1,
    "product_name": "Paracetamol 500mg",
    "total_quantity_deducted": 1000,
    "previous_stock": 20000,
    "new_stock": 19000,
    "deduction_details": [
      {
        "batch_id": 15,
        "batch_number": "LOT2025-003",
        "quantity_deducted": 500,
        "expiry_date": "2026-04-15"
      },
      {
        "batch_id": 18,
        "batch_number": "LOT2025-005",
        "quantity_deducted": 500,
        "expiry_date": "2026-06-30"
      }
    ]
  }
}
```

**Error Response (400 - สต็อกไม่เพียงพอ):**
```json
{
  "success": false,
  "message": "Insufficient stock",
  "data": {
    "requested": 50000,
    "available": 19000,
    "shortage": 31000
  }
}
```

---

### POST /api/stock/adjust

ปรับสต็อก

**Required Permission:** `stock:adjust` (Admin, Manager)

**Request Body:**
```json
{
  "product_id": 1,
  "batch_id": 42,
  "adjustment_type": "decrease",
  "quantity": 100,
  "reason": "ตรวจนับพบการสูญเสีย 100 ชิ้น"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock adjusted successfully",
  "data": {
    "product_id": 1,
    "product_name": "Paracetamol 500mg",
    "adjustment_type": "decrease",
    "quantity_adjusted": 100,
    "previous_stock": 5000,
    "new_stock": 4900,
    "reason": "ตรวจนับพบการสูญเสีย 100 ชิ้น",
    "adjusted_by": "admin",
    "adjustment_id": 55
  }
}
```

---

### GET /api/stock/levels

ดูระดับสต็อก

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `product_id` | number | - | กรองตาม Product ID |
| `category` | string | - | กรองตามหมวดหมู่ |
| `low_stock` | boolean | false | แสดงเฉพาะสต็อกต่ำ |
| `page` | number | 1 | หน้า |
| `limit` | number | 50 | รายการต่อหน้า |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": 1,
      "code": "DRUG001",
      "name": "Paracetamol 500mg",
      "category": "Medicine",
      "unit": "Tablet",
      "current_stock": 15000,
      "min_stock": 1000,
      "stock_status": "normal",
      "batch_count": 3
    },
    {
      "product_id": 2,
      "code": "DRUG002",
      "name": "Amoxicillin 500mg",
      "category": "Antibiotic",
      "unit": "Capsule",
      "current_stock": 450,
      "min_stock": 500,
      "stock_status": "low_stock",
      "batch_count": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 11847,
    "totalPages": 237
  }
}
```

---

### GET /api/stock/expiry-alerts

ดูการแจ้งเตือนหมดอายุ

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 30 | จำนวนวันล่วงหน้า |

**Response:**
```json
{
  "success": true,
  "data": {
    "all": [
      {
        "batch_id": 15,
        "batch_number": "LOT2025-003",
        "product_id": 1,
        "product_code": "DRUG001",
        "product_name": "Paracetamol 500mg",
        "category": "Medicine",
        "quantity": 500,
        "expiry_date": "2026-04-15",
        "days_until_expiry": 15,
        "expiry_status": "critical"
      }
    ],
    "grouped": {
      "expired": [],
      "critical": [...],
      "warning": [...]
    },
    "summary": {
      "total": 23,
      "expired": 2,
      "critical": 8,
      "warning": 13
    }
  }
}
```

---

## 🛒 Purchase Orders API

### GET /api/purchase-orders

ดึงรายการใบสั่งซื้อทั้งหมด

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | กรองตามสถานะ |
| `supplier` | string | - | ค้นหาจากชื่อซัพพลายเออร์ |
| `from_date` | date | - | วันที่เริ่มต้น |
| `to_date` | date | - | วันที่สิ้นสุด |
| `page` | number | 1 | หน้า |
| `limit` | number | 50 | รายการต่อหน้า |

**Status Values:**
- `pending` - รออนุมัติ
- `approved` - อนุมัติแล้ว
- `rejected` - ปฏิเสธแล้ว
- `completed` - รับสินค้าแล้ว
- `cancelled` - ยกเลิก

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_number": "PO-20260331-0001",
      "supplier_name": "ABC Pharma Ltd.",
      "status": "pending",
      "total_amount": 5000.00,
      "order_date": "2026-03-31",
      "expected_delivery_date": "2026-04-07",
      "created_by_name": "admin",
      "items_count": 2,
      "created_at": "2026-03-31T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

---

### GET /api/purchase-orders/pending

ดึงรายการ PO ที่รออนุมัติ

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_number": "PO-20260331-0001",
      "supplier_name": "ABC Pharma Ltd.",
      "status": "pending",
      "total_amount": 5000.00,
      "created_at": "2026-03-31T08:30:00.000Z",
      "created_by_name": "staff",
      "items": [...]
    }
  ]
}
```

---

### GET /api/purchase-orders/:id

ดึงข้อมูล PO ตาม ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "PO-20260331-0001",
    "supplier_name": "ABC Pharma Ltd.",
    "supplier_contact": "John Doe - 081-234-5678",
    "status": "pending",
    "total_amount": 6500.00,
    "order_date": "2026-03-31",
    "expected_delivery_date": "2026-04-07",
    "notes": "สั่งซื้อเพิ่มเติมจากความต้องการ Q2",
    "created_by": 1,
    "created_by_name": "admin",
    "approved_by": null,
    "approved_at": null,
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_code": "DRUG001",
        "product_name": "Paracetamol 500mg",
        "category": "Medicine",
        "unit": "Tablet",
        "quantity": 10000,
        "unit_price": 0.45,
        "total_price": 4500.00
      },
      {
        "id": 2,
        "product_id": 2,
        "product_code": "DRUG002",
        "product_name": "Amoxicillin 500mg",
        "category": "Antibiotic",
        "unit": "Capsule",
        "quantity": 2000,
        "unit_price": 1.00,
        "total_price": 2000.00
      }
    ],
    "created_at": "2026-03-31T08:30:00.000Z",
    "updated_at": "2026-03-31T08:30:00.000Z"
  }
}
```

---

### POST /api/purchase-orders

สร้างใบสั่งซื้อใหม่

**Required Permission:** `purchase-orders:write` (Admin, Manager, Staff)

**Request Body:**
```json
{
  "supplier_id": 1,
  "supplier_name": "ABC Pharma Ltd.",
  "supplier_contact": "John Doe - 081-234-5678",
  "expected_delivery_date": "2026-04-07",
  "notes": "สั่งซื้อเพิ่มเติมจากความต้องการ Q2",
  "items": [
    {
      "product_id": 1,
      "quantity": 10000,
      "unit_price": 0.45
    },
    {
      "product_id": 2,
      "quantity": 2000,
      "unit_price": 1.00
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Purchase order created successfully",
  "data": {
    "order_id": 1,
    "order_number": "PO-20260331-0001",
    "status": "pending",
    "total_amount": 6500.00,
    "items_count": 2
  }
}
```

---

### POST /api/purchase-orders/:id/approve

อนุมัติใบสั่งซื้อ

**Required Permission:** `purchase-orders:approve` (Admin, Manager)

**Response:**
```json
{
  "success": true,
  "message": "Purchase order approved successfully",
  "data": {
    "order_id": 1,
    "order_number": "PO-20260331-0001",
    "status": "approved",
    "approved_by": "manager",
    "approved_at": "2026-03-31T10:30:00.000Z"
  }
}
```

---

### POST /api/purchase-orders/:id/reject

ปฏิเสธใบสั่งซื้อ

**Required Permission:** `purchase-orders:approve` (Admin, Manager)

**Request Body:**
```json
{
  "reason": "ราคาสูงเกินงบประมาณที่กำหนด"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Purchase order rejected",
  "data": {
    "order_id": 1,
    "order_number": "PO-20260331-0001",
    "status": "rejected",
    "rejection_reason": "ราคาสูงเกินงบประมาณที่กำหนด"
  }
}
```

---

## 🏭 Suppliers API

### GET /api/suppliers

ดึงรายการซัพพลายเออร์ทั้งหมด

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | - | ค้นหาจากชื่อ |
| `active` | boolean | true | แสดงเฉพาะ active |
| `page` | number | 1 | หน้า |
| `limit` | number | 50 | รายการต่อหน้า |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "ABC Pharma Ltd.",
      "contact_person": "John Doe",
      "phone": "081-234-5678",
      "email": "john@abcpharma.com",
      "address": "123 Main Street, Bangkok",
      "rating": 4.5,
      "total_orders": 25,
      "is_active": true,
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/suppliers

สร้างซัพพลายเออร์ใหม่

**Required Permission:** `suppliers:write` (Admin, Manager)

**Request Body:**
```json
{
  "name": "XYZ Medical Supplies",
  "contact_person": "Jane Smith",
  "phone": "089-876-5432",
  "email": "jane@xyzmed.com",
  "address": "456 Health Road, Chiang Mai",
  "tax_id": "1234567890"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Supplier created successfully",
  "data": {
    "id": 2,
    "name": "XYZ Medical Supplies"
  }
}
```

---

## 📊 Dashboard API

### GET /api/dashboard/summary

ดึงข้อมูลสรุปภาพรวม

**Response:**
```json
{
  "success": true,
  "data": {
    "products": {
      "total": 11847,
      "active": 11500
    },
    "inventory": {
      "total_value": 24500000.00,
      "total_units": 500000
    },
    "orders": {
      "total": 125,
      "pending": 5,
      "approved": 20,
      "completed": 98,
      "rejected": 2,
      "total_value": 8500000.00
    },
    "batches": {
      "total": 350,
      "expired": 2,
      "expiring_soon": 23
    },
    "low_stock": {
      "count": 15,
      "out_of_stock": 3
    },
    "transactions_today": {
      "total": 60,
      "receipts": 12,
      "deductions": 45,
      "adjustments": 3
    }
  }
}
```

---

### GET /api/dashboard/expiry

ดึงข้อมูลการหมดอายุ

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 90 | จำนวนวันที่ต้องการดู |

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "expired": { "batch_count": 2, "total_units": 500 },
      "critical": { "batch_count": 8, "total_units": 2300 },
      "warning": { "batch_count": 13, "total_units": 4500 },
      "monitor": { "batch_count": 25, "total_units": 8900 }
    },
    "expired_items": [...],
    "critical_items": [...]
  }
}
```

---

### GET /api/dashboard/low-stock

ดึงรายการสต็อกต่ำ

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 2,
        "product_code": "DRUG002",
        "product_name": "Amoxicillin 500mg",
        "category": "Antibiotic",
        "current_stock": 450,
        "min_stock": 500,
        "shortage": 50,
        "unit_price": 1.00,
        "stock_status": "low_stock"
      }
    ],
    "summary": {
      "total_items": 15,
      "out_of_stock": 3,
      "low_stock": 12
    }
  }
}
```

---

### GET /api/dashboard/movement-history

ดึงประวัติการเคลื่อนไหวสต็อก

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 30 | จำนวนวันย้อนหลัง |
| `product_id` | number | - | กรองตามสินค้า |
| `type` | string | - | ประเภท (receipt, deduct, adjust) |
| `page` | number | 1 | หน้า |
| `limit` | number | 50 | รายการต่อหน้า |

**Response:**
```json
{
  "success": true,
  "data": {
    "movements": [
      {
        "id": 1001,
        "type": "receipt",
        "product_id": 1,
        "product_code": "DRUG001",
        "product_name": "Paracetamol 500mg",
        "quantity": 5000,
        "previous_stock": 10000,
        "new_stock": 15000,
        "batch_number": "LOT2026-001",
        "notes": "รับเข้าจาก ABC Pharma",
        "created_at": "2026-03-31T09:30:00.000Z",
        "created_by": "admin"
      }
    ],
    "statistics": {
      "total": 120,
      "received": 15000,
      "deducted": 8500,
      "adjusted": 200,
      "net_change": 6500
    }
  }
}
```

---

## 📈 Reports API

### GET /api/reports/stock-value

รายงานมูลค่าสต็อก

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | กรองตามหมวดหมู่ |
| `format` | string | json | รูปแบบ (json, excel, pdf) |

**Response:**
```json
{
  "success": true,
  "data": {
    "report_date": "2026-03-31",
    "total_value": 24500000.00,
    "by_category": [
      {
        "category": "Medicine",
        "item_count": 5000,
        "total_value": 12000000.00,
        "percentage": 49.0
      }
    ],
    "items": [...]
  }
}
```

---

### GET /api/reports/expiry

รายงานยาหมดอายุ

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 90 | จำนวนวันล่วงหน้า |
| `format` | string | json | รูปแบบ |

---

### GET /api/reports/movement

รายงานการเคลื่อนไหวสต็อก

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `from_date` | date | - | วันที่เริ่มต้น |
| `to_date` | date | - | วันที่สิ้นสุด |
| `product_id` | number | - | กรองตามสินค้า |
| `type` | string | - | ประเภท |
| `format` | string | json | รูปแบบ |

---

## 👥 Users API

### GET /api/users

ดึงรายการผู้ใช้งาน

**Required Permission:** `users:read` (Admin)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@phoubon.go.th",
      "full_name": "System Administrator",
      "role": "admin",
      "is_active": true,
      "last_login": "2026-03-31T08:00:00.000Z",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/users

สร้างผู้ใช้ใหม่

**Required Permission:** `users:write` (Admin)

**Request Body:**
```json
{
  "username": "newuser",
  "password": "securePassword123",
  "email": "newuser@phoubon.go.th",
  "full_name": "New User",
  "role": "staff"
}
```

---

### PUT /api/users/:id

แก้ไขข้อมูลผู้ใช้

**Required Permission:** `users:write` (Admin)

---

### POST /api/users/:id/reset-password

รีเซ็ตรหัสผ่านผู้ใช้

**Required Permission:** `users:write` (Admin)

---

## ❌ Error Handling

### Error Response Format

```json
{
  "success": false,
  "message": "Error message in Thai",
  "error": "Detailed error (development mode)",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | ต้องล็อกอินก่อน |
| `INVALID_TOKEN` | 401 | Token ไม่ถูกต้อง |
| `TOKEN_EXPIRED` | 401 | Token หมดอายุ |
| `FORBIDDEN` | 403 | ไม่มีสิทธิ์เข้าถึง |
| `NOT_FOUND` | 404 | ไม่พบข้อมูล |
| `VALIDATION_ERROR` | 400 | ข้อมูลไม่ถูกต้อง |
| `INSUFFICIENT_STOCK` | 400 | สต็อกไม่เพียงพอ |
| `DUPLICATE_ENTRY` | 409 | ข้อมูลซ้ำ |

### Example Errors

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Product code and name are required",
  "code": "VALIDATION_ERROR"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "You don't have permission to perform this action",
  "code": "FORBIDDEN"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Product not found",
  "code": "NOT_FOUND"
}
```

---

## ⏱️ Rate Limiting

### Limits

| Endpoint Type | Rate Limit |
|---------------|------------|
| Read (GET) | 100 requests/minute |
| Write (POST/PUT/DELETE) | 30 requests/minute |
| Auth (Login) | 10 requests/minute |

### Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1617200000
```

### Rate Limit Exceeded (429)

```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

---

## 📝 Webhook Events (Future)

ระบบจะรองรับ Webhook สำหรับการแจ้งเตือนในอนาคต:

- `stock.low` - เมื่อสต็อกต่ำ
- `stock.expiry` - เมื่อใกล้หมดอายุ
- `po.approved` - เมื่อ PO ถูกอนุมัติ
- `po.completed` - เมื่อ PO เสร็จสิ้น

---

*API Documentation last updated: มีนาคม 2026*