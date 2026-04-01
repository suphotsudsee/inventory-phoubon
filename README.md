# 📦 ระบบบริหารจัดการคลังเวชภัณฑ์ ภูพาน
# Inventory Phoubon Management System

> ระบบจัดการคลังสินค้าและการจัดซื้อจัดจ้างสำหรับโรงพยาบาล

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://mysql.com/)

---

## 📋 ภาพรวมระบบ

ระบบบริหารจัดการคลังเวชภัณฑ์ ภูพาน เป็นระบบ Single-Tenant สำหรับจัดการยาและเวชภัณฑ์ในโรงพยาบาล ออกแบบมาเพื่อรองรับการทำงานของเภสัชกรและบุคลากรคลังเวชภัณฑ์

### 📊 ข้อมูล Master Data

- แหล่งข้อมูล: ไฟล์ Excel "ตารางแสดงปริมาณสำรองคงคลังของยาและเวชภัณฑ์.xlsx"
- จำนวนรายการสินค้า: ~11,847 รายการ
- หมวดหมู่: ยา, เวชภัณฑ์, วัสดุการแพทย์

### ✨ ฟีเจอร์หลัก

| ฟีเจอร์ | รายละเอียด |
|---------|------------|
| 📊 **Dashboard** | ภาพรวมระบบ แจ้งเตือนสต็อกต่ำ ยาใกล้หมดอายุ |
| 📦 **จัดการสต็อก** | รับเข้า ตัดสต็อก (FEFO) ปรับสต็อก ตรวจนับ |
| 🛒 **จัดซื้อจัดจ้าง** | สร้างใบสั่งซื้อ (PO) อนุมัติ/ปฏิเสธ ติดตามสถานะ |
| 📈 **รายงาน** | มูลค่าสต็อก ยาหมดอายุ ประเมินซัพพลายเออร์ |
| 🔐 **สิทธิ์การใช้งาน** | Admin, Manager, Staff, Viewer |

---

## 🛠️ Technology Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **TanStack Query** - Data fetching
- **React Router** - Client-side routing

### Backend
- **Node.js 18+** - Runtime
- **Express** - Web framework
- **MySQL2** - Database driver

### Database
- **MySQL 8.0** - Primary database

---

## 🚀 การติดตั้งและรัน

### Option 1: Docker Compose (แนะนำ)

```bash
# Clone repository
cd C:\fullstack\inventory-phoubon

# สร้างไฟล์ .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# แก้ไขค่าใน .env ให้ตรงกับ environment ของคุณ

# รันทุกอย่างด้วย Docker Compose
docker-compose up -d --build

# ระบบจะพร้อมใช้งานที่:
# Frontend: http://localhost:5173
# Backend: http://localhost:3002
# MySQL: localhost:3306
```

### Option 2: Manual Setup

#### 1. Database Setup

```bash
# สร้าง database
mysql -u root -p -e "CREATE DATABASE inventory_phoubon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# รัน schema
mysql -u root -p inventory_phoubon < backend/database/schema.sql

# (Optional) นำเข้าข้อมูล Master Data จาก Excel
cd scripts
python migrate-master-data.py
```

#### 2. Backend Setup

```bash
cd backend

# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env
cp .env.example .env
# แก้ไขค่าใน .env

# รัน development server
npm run dev
# Backend จะรันที่ http://localhost:3002
```

ไฟล์ `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=inventory_phoubon
PORT=3002
NODE_ENV=development
JWT_SECRET=your-jwt-secret-change-in-production
```

#### 3. Frontend Setup

```bash
cd frontend

# ติดตั้ง dependencies
npm install

# สร้างไฟล์ .env
cp .env.example .env

# รัน development server
npm run dev
# Frontend จะรันที่ http://localhost:5173
```

---

## 🔐 ข้อมูลเข้าสู่ระบบ (Default Credentials)

| Username | Password | Role | สิทธิ์ |
|----------|----------|------|-------|
| `admin` | `admin123` | Administrator | ทุกฟีเจอร์ |
| `manager` | `manager123` | Manager | จัดการสต็อก, อนุมัติ PO, รายงาน |
| `staff` | `staff123` | Staff | รับเข้า/ตัดสต็อก, สร้าง PO |
| `viewer` | `viewer123` | Viewer | ดูข้อมูลอย่างเดียว |

⚠️ **ควรเปลี่ยนรหัสผ่านหลังจากติดตั้งระบบแล้ว**

---

## 📁 โครงสร้างโปรเจค

```
inventory-phoubon/
├── backend/                    # Node.js API Server
│   ├── database/
│   │   └── schema.sql          # Database schema
│   ├── db/
│   │   ├── connection.js       # DB connection
│   │   └── pool.js             # Connection pool
│   ├── middleware/
│   │   ├── auth.js             # Authentication middleware
│   │   └── rate-limit.js       # Rate limiting
│   ├── routes/
│   │   ├── auth.js             # Authentication endpoints
│   │   ├── products.js         # Products CRUD
│   │   ├── stock.js            # Stock operations
│   │   ├── purchase-orders.js  # PO workflow
│   │   ├── suppliers.js        # Suppliers management
│   │   ├── dashboard.js        # Dashboard data
│   │   ├── reports.js          # Reports endpoints
│   │   └── users.js            # Users management
│   ├── utils/
│   │   ├── rbac.js             # Role-based access control
│   │   ├── audit-log.js        # Audit logging
│   │   └── stock-balance.js    # Stock calculations
│   ├── server.js               # Entry point
│   └── package.json
│
├── frontend/                   # React Web UI
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── common/         # Shared UI components
│   │   │   ├── dashboard/      # Dashboard widgets
│   │   │   ├── procurement/    # PO components
│   │   │   ├── reports/        # Report components
│   │   │   └── stock/          # Stock management
│   │   ├── contexts/           # React contexts
│   │   ├── pages/              # Page components
│   │   ├── services/           # API services
│   │   └── App.tsx             # Main app
│   ├── index.html
│   └── package.json
│
├── scripts/                    # Utility scripts
│   ├── migrate-master-data.py  # Excel to DB migration
│   └── seed.js                 # Initial data
│
├── docs/                       # Documentation
│   ├── USER_MANUAL.md          # คู่มือผู้ใช้
│   ├── API_DOCUMENTATION.md    # API reference
│   ├── DEPLOYMENT_GUIDE.md     # Deployment guide
│   ├── QUICK_START.md         # Quick start guide
│   └── PROJECT_SUMMARY.md      # Project summary
│
├── docker-compose.yml          # Docker Compose config
└── README.md                   # This file
```

---

## 📖 เอกสารเพิ่มเติม

| เอกสาร | รายละเอียด |
|--------|-----------|
| [📘 คู่มือผู้ใช้](docs/USER_MANUAL.md) | คู่มือการใช้งานสำหรับผู้ใช้ทั่วไป |
| [🔌 API Documentation](docs/API_DOCUMENTATION.md) | API reference สำหรับนักพัฒนา |
| [🚀 Deployment Guide](docs/DEPLOYMENT_GUIDE.md) | คู่มือการ deploy ระบบ |
| [⚡ Quick Start](docs/QUICK_START.md) | เริ่มต้นใช้งานใน 5 นาที |
| [📊 Project Summary](docs/PROJECT_SUMMARY.md) | สรุปโปรเจค |

---

## 🔌 API Endpoints Overview

### Base URL: `http://localhost:3002/api`

| Category | Endpoints |
|----------|-----------|
| **Auth** | `POST /auth/login`, `POST /auth/logout` |
| **Products** | `GET/POST /products`, `GET/PUT/DELETE /products/:id` |
| **Stock** | `POST /stock/receipt`, `POST /stock/deduct`, `POST /stock/adjust`, `GET /stock/levels` |
| **Purchase Orders** | `GET/POST /purchase-orders`, `POST /purchase-orders/:id/approve` |
| **Suppliers** | `GET/POST /suppliers`, `GET/PUT/DELETE /suppliers/:id` |
| **Dashboard** | `GET /dashboard/summary`, `GET /dashboard/expiry`, `GET /dashboard/low-stock` |
| **Reports** | `GET /reports/stock-value`, `GET /reports/expiry`, `GET /reports/movement` |
| **Users** | `GET/POST /users`, `GET/PUT/DELETE /users/:id` |

📖 รายละเอียดเต็ม: [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)

---

## 🔐 Role Permissions

| ฟีเจอร์ | Admin | Manager | Staff | Viewer |
|---------|-------|---------|-------|--------|
| ดู Dashboard | ✅ | ✅ | ✅ | ✅ |
| จัดการสินค้า | ✅ | ✅ | ✅ | ❌ |
| รับเข้า/ตัดสต็อก | ✅ | ✅ | ✅ | ❌ |
| สร้างใบสั่งซื้อ | ✅ | ✅ | ✅ | ❌ |
| อนุมัติใบสั่งซื้อ | ✅ | ✅ | ❌ | ❌ |
| ปรับสต็อก | ✅ | ✅ | ❌ | ❌ |
| ดูรายงาน | ✅ | ✅ | ✅ | ✅ |
| จัดการผู้ใช้ | ✅ | ❌ | ❌ | ❌ |

---

## 🧪 Development

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Build for Production

```bash
# Frontend build
cd frontend
npm run build
# Output: frontend/dist/

# Backend (no build needed for Node.js)
# Use PM2 for production
pm2 start backend/server.js --name inventory-phoubon-api
```

---

## 📝 License

MIT License

---

## 👨‍💻 Development Team

พัฒนาโดยทีมพัฒนาโรงพยาบาล

---

## 📞 ติดต่อสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือ:

- 📧 Email: support@phoubon-hospital.go.th
- 📞 โทร: 04x-xxx-xxx ต่อ xxxx

---

*Last updated: มีนาคม 2026*