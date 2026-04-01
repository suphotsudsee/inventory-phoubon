# 📋 Project Summary
# ระบบบริหารจัดการคลังเวชภัณฑ์ (Inventory Phoubon)

> สรุปโปรเจคและบทเรียนที่ได้รับ

---

## 🏥 ภาพรวมโปรเจค

**ชื่อโปรเจค:** ระบบบริหารจัดการคลังเวชภัณฑ์
**เวอร์ชัน:** 1.0.0  
**วันที่สร้าง:** มีนาคม 2569  
**ภาษาหลัก:** ไทย (UI), English (Code/Comments)

---

## 🎯 วัตถุประสงค์

ระบบจัดการคลังยาและเวชภัณฑ์สำหรับโรงพยาบาล ออกแบบมาเพื่อ:
- บริหารจัดการข้อมูลยาและเวชภัณฑ์ (~11,847 รายการ)
- ติดตามสต็อกคงเหลือแบบ Real-time
- จัดการใบสั่งซื้อและอนุมัติ
- แจ้งเตือนสต็อกต่ำและยาใกล้หมดอายุ
- ออกรายงานสำหรับผู้บริหาร

---

## 🛠️ Technology Stack

### Backend
| Technology | เวอร์ชัน | หมายเหตุ |
|------------|----------|----------|
| Node.js | 18.x+ | Runtime |
| Express.js | 4.x | Web framework |
| MySQL | 8.0 | Database |
| mysql2 | 3.x | MySQL driver |
| bcryptjs | 2.x | Password hashing |
| jsonwebtoken | 9.x | JWT auth |

### Frontend
| Technology | เวอร์ชัน | หมายเหตุ |
|------------|----------|----------|
| React | 19.x | UI library |
| Vite | 6.x | Build tool |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| TanStack Query | 5.x | Data fetching |
| React Router | 6.x | Routing |

---

## 🗄️ Database Design

### Source Data
ข้อมูลหลักมาจากไฟล์ Excel:
```
ตารางแสดงปริมาณสำรองคงคลังของยาและเวชภัณฑ์.xlsx
├── table-10      → ข้อมูลยา 11,847 รายการ (GPUID, DrugName, DispUnit, Groups, Service_plan, WachtList)
├── Ubon-Total    → ข้อมูลสต็อก 8,026 รายการ (stock quantities)
└── drugcode      → ข้อมูลเพิ่มเติม
```

### Main Tables
```
products              → ข้อมูลสินค้า/ยา (Master Data)
stock_lots            → สต็อกแยกตาม Lot (FEFO tracking)
stock_levels          → ยอดรวมต่อสินค้า
stock_movements       → ประวัติการเคลื่อนไหว
stock_adjustments     → ประวัติการปรับสต็อก
purchase_orders       → ใบสั่งซื้อ
purchase_order_items  → รายการในใบสั่งซื้อ
suppliers             → ข้อมูลซัพพลายเออร์
users                 → ผู้ใช้ระบบ
categories            → หมวดหมู่สินค้า
drugtypes             → ประเภทยา
```

### Key Design Decisions

1. **FEFO (First Expired First Out)** — ตัดสต็อกจาก Lot ที่หมดอายุก่อน
2. **Single Tenant** — ไม่ใช้ multi-tenancy เนื่องจากเป็นระบบสำหรับโรงพยาบาลเดียว
3. **Soft Delete** — ลบข้อมูลโดยตั้ง is_active = false เพื่อรักษาประวัติ
4. **Batch Tracking** — ทุกรายการรับ/ตัดสต็อกต้องระบุ Lot number

---

## 📊 Data Migration Notes

### Excel to MySQL Mapping

| Excel Column | Database Column | Notes |
|-------------|-----------------|-------|
| GPUID | product_code | ใช้เป็น unique code |
| DrugName | product_name | ชื่อยาเต็ม |
| DispUnit | unit_sell | หน่วยจ่าย |
| Groups | category_name | หมวดหมู่ยา |
| WachtList | min_stock_level | ระดับสต็อกขั้นต่ำ |
| stock_qty (จาก Ubon-Total) | stock_levels.quantity | ยอดสต็อกปัจจุบัน |

### Seed Process
1. อ่านไฟล์ Excel ด้วย openpyxl
2. Insert categories ก่อน (unique)
3. Insert products พร้อม category_id reference
4. Update stock_levels.quantity จาก Ubon-Total
5. Create default admin user

---

## 🔐 Security

- **Authentication:** JWT Bearer Token
- **Password:** bcryptjs hashing (10 rounds)
- **Role-based Access:** 4 ระดับ (admin, manager, staff, viewer)
- **Input Validation:** Server-side validation ทุก endpoint
- **CORS:** จำกัด origin ใน production

---

## 📝 Role Permissions

| Feature | Admin | Manager | Staff | Viewer |
|---------|-------|---------|-------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| ดูสต็อก | ✅ | ✅ | ✅ | ✅ |
| รับ/ตัดสต็อก | ✅ | ✅ | ✅ | ❌ |
| ปรับสต็อก | ✅ | ✅ | ❌ | ❌ |
| จัดการยา | ✅ | ✅ | ❌ | ❌ |
| สร้าง PO | ✅ | ✅ | ✅ | ❌ |
| อนุมัติ PO | ✅ | ✅ | ❌ | ❌ |
| จัดการซัพพลายเออร์ | ✅ | ✅ | ❌ | ❌ |
| ออกรายงาน | ✅ | ✅ | ✅ | ✅ |
| จัดการผู้ใช้ | ✅ | ❌ | ❌ | ❌ |

---

## ⚠️ Known Limitations

1. **ไม่มี WebSocket/SSE** — Dashboard refresh ทุก 30 วินาที
2. **ไม่รองรับหลาย Facility** — Single-tenant เท่านั้น
3. **ไม่มี Barcode Printing** — อยู่ในแผนงาน future
4. **ไม่มี Mobile App** — Web responsive เท่านั้น
5. **ไม่มี Email/SMS Notifications** — Alert ในระบบเท่านั้น

---

## 🚀 Future Enhancement Ideas

1. **Barcode/QR Code System** — พิมพ์ barcode สำหรับจัดเก็บ
2. **Mobile App** — React Native หรือ PWA
3. **SMS/Email Alerts** — แจ้งเตือนสต็อกต่ำ
4. **Multi-hospital Support** — เพิ่ม multi-tenancy
5. **BI Dashboard** — รายงานเชิงลึกด้วย charts
6. **Integration** — ต่อกับระบบ HIS/NHSO
7. **Document Management** — เก็บใบอนุญาต, COA

---

## 📚 Documentation

| File | Description |
|------|-------------|
| README.md | โปรเจค overview |
| QUICK_START.md | คู่มือเริ่มใช้งานเร็ว |
| USER_MANUAL.md | คู่มือผู้ใช้เต็มรูปแบบ |
| API_DOCUMENTATION.md | API Reference |
| DEPLOYMENT_GUIDE.md | คู่มือติดตั้ง Production |
| PROJECT_SUMMARY.md | สรุปโปรเจคนี้ |

---

## 🙏 Credits

- **Reference Project:** inventory-procurement (Multi-tenant SaaS)
- **Data Source:** ตารางแสดงปริมาณสำรองคงคลังของยาและเวชภัณฑ์
- **Development Team:** OpenClaw Multi-Agent System

---

*Document created: มีนาคม 2569*
