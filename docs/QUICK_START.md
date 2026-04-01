# 🚀 Quick Start Guide
# ระบบบริหารจัดการคลังเวชภัณฑ์

---

## สิ่งที่ต้องมีก่อนเริ่ม

| Software | เวอร์ชัน |
|----------|----------|
| Node.js | 18.x ขึ้นไป |
| MySQL | 8.0 ขึ้นไป |
| Docker (optional) | Latest |

---

## 5 ขั้นตอนเริ่มต้นใช้งาน

### ขั้นตอนที่ 1: Clone / Copy โปรเจค

```bash
cd C:\fullstack
git clone <repo-url> inventory-phoubon
# หรือ copy จาก reference project:
# xcopy /E /I C:\fullstack\inventory-procurement C:\fullstack\inventory-phoubon
```

### ขั้นตอนที่ 2: ตั้งค่า Database

```bash
# เข้า MySQL
mysql -u root -p

# สร้าง database
CREATE DATABASE inventory_phoubon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# รัน schema
mysql -u root -p inventory_phoubon < backend/database/schema.sql

# Seed ข้อมูลเริ่มต้น
cd backend
node database/seed.js
```

### ขั้นตอนที่ 3: ตั้งค่า Environment

**backend/.env**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=inventory_phoubon
PORT=3002
NODE_ENV=development
JWT_SECRET=phoubon_secret_change_this
```

**frontend/.env**
```env
VITE_API_PROXY_TARGET=http://localhost:3002
```

### ขั้นตอนที่ 4: รัน Backend

```bash
cd backend
npm install
npm run dev
# รอจนเห็น: Server listening on http://localhost:3002
```

### ขั้นตอนที่ 5: รัน Frontend

```bash
cd frontend
npm install
npm run dev
# เปิดเบราว์เซอร์: http://localhost:5174
```

---

## 🎯 ทดสอบระบบ

### Login ด้วย Default Account

| Username | Password | สิทธิ์ |
|----------|----------|--------|
| admin | admin123 | Admin |
| manager | manager123 | Manager |
| staff | staff123 | Staff |

### ทดสอบขั้นต้น

1. **เข้าสู่ระบบ** → ใช้ admin / admin123
2. **Dashboard** → ดูภาพรวมมูลค่าสต็อก
3. **จัดการสต็อก** → ดูรายการยา (~11,847 รายการจาก Excel)
4. **จัดซื้อ** → สร้างใบสั่งซื้อ
5. **รายงาน** → ดูรายงานมูลค่าสต็อก

---

## 🐳 รันด้วย Docker (เร็วที่สุด)

```bash
cd C:\fullstack\inventory-phoubon

# Build และรันทุก service
docker-compose up -d

# ดูสถานะ
docker-compose ps

# Frontend: http://localhost:5174
# Backend API: http://localhost:3002
# MySQL: localhost:3308
```

---

## 📁 โครงสร้างโปรเจค

```
inventory-phoubon/
├── backend/
│   ├── database/
│   │   ├── schema.sql      ← โครงสร้างตาราง MySQL
│   │   └── seed.js         ← นำเข้าข้อมูลจาก Excel
│   ├── routes/              ← API endpoints
│   ├── middleware/          ← Auth, error handling
│   ├── utils/               ← SQL helpers
│   ├── db/                  ← DB connection pool
│   ├── server.js            ← Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/          ← React pages
│   │   ├── components/     ← UI components
│   │   ├── services/       ← API calls
│   │   └── contexts/       ← Auth context
│   └── package.json
├── docs/                    ← เอกสารคู่มือ
├── docker-compose.yml
└── README.md
```

---

## ปัญหาที่พบบ่อย

### "Cannot connect to database"
```bash
# ตรวจสอบ MySQL ทำงานอยู่หรือไม่
net start MySQL80   # Windows
sudo systemctl start mysql   # Linux
```

### "Port already in use"
```bash
# เปลี่ยน port ใน backend/.env
PORT=3003

# แก้ vite.config.ts proxy
'/api': { target: 'http://localhost:3003', ... }
```

### "npm install ล้มเหลว"
```bash
# ลบ node_modules แล้วติดตั้งใหม่
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install
```

---

## 📞 ติดต่อสอบถาม

หากพบปัญหาในการติดตั้ง:
- ดู DEPLOYMENT_GUIDE.md ฉบับเต็ม
- ดู API_DOCUMENTATION.md สำหรับ API reference

---

*Updated: มีนาคม 2026*
