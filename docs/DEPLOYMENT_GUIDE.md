# 🚀 Deployment Guide
# ระบบบริหารจัดการคลังเวชภัณฑ์

> คู่มือการ deploy ระบบสำหรับ Production Environment

---

## 📑 สารบัญ

- [ข้อกำหนดเบื้องต้น](#ข้อกำหนดเบื้องต้น)
- [Option 1: Docker Compose Deployment](#option-1-docker-compose-deployment)
- [Option 2: Manual Deployment](#option-2-manual-deployment)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Production Checklist](#production-checklist)

---

## 📋 ข้อกำหนดเบื้องต้น (Prerequisites)

### Hardware Requirements

| รายการ | ขั้นต่ำ | แนะนำ |
|--------|---------|-------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Software Requirements

| Software | เวอร์ชันขั้นต่ำ | เวอร์ชันแนะนำ |
|----------|----------------|----------------|
| Node.js | 18.x | 20.x LTS |
| MySQL | 8.0 | 8.0.x |
| Docker | 24.x | 26.x |
| Docker Compose | 2.x | 2.x |
| npm | 9.x | 10.x |

### Operating System

- **Windows Server 2019+**
- **Ubuntu 20.04 LTS+**
- **CentOS 8+**

---

## 🐳 Option 1: Docker Compose Deployment (แนะนำ)

### ขั้นตอนที่ 1: เตรียมไฟล์

```bash
# Clone หรือ copy โปรเจค
cd C:\fullstack\inventory-phoubon

# สร้างไฟล์ .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### ขั้นตอนที่ 2: แก้ไข Environment Variables

**backend/.env:**

```env
# Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=inventory_user
DB_PASSWORD=CHANGE_THIS_TO_STRONG_PASSWORD
DB_NAME=inventory_phoubon

# Server
PORT=3002
NODE_ENV=production

# Security
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_32CHARS_MIN

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**frontend/.env:**

```env
VITE_API_URL=http://your-server-ip:3002
```

### ขั้นตอนที่ 3: แก้ไข docker-compose.yml

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: phoubon-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD:-change_this_root_password}
      MYSQL_DATABASE: inventory_phoubon
      MYSQL_USER: inventory_user
      MYSQL_PASSWORD: ${DB_PASSWORD:-change_this_password}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    ports:
      - "${MYSQL_HOST_PORT:-3306}:3306"
    networks:
      - phoubon-network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: phoubon-backend
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: inventory_user
      DB_PASSWORD: ${DB_PASSWORD:-change_this_password}
      DB_NAME: inventory_phoubon
      JWT_SECRET: ${JWT_SECRET:-change_this_jwt_secret}
      PORT: 3002
      NODE_ENV: production
    depends_on:
      mysql:
        condition: service_healthy
    ports:
      - "3002:3002"
    networks:
      - phoubon-network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: phoubon-frontend
    environment:
      VITE_API_URL: ${VITE_API_URL:-http://localhost:3002}
    depends_on:
      - backend
    ports:
      - "80:80"
    networks:
      - phoubon-network
    restart: unless-stopped

volumes:
  mysql_data:
    driver: local

networks:
  phoubon-network:
    driver: bridge
```

### ขั้นตอนที่ 4: Build และ Start

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# ตรวจสอบ status
docker-compose ps

# ดู logs
docker-compose logs -f

# หยุด services
docker-compose down

# รีสตาร์ท
docker-compose restart
```

### ขั้นตอนที่ 5: ตรวจสอบ

```bash
# ตรวจสอบ MySQL
docker-compose exec mysql mysql -u root -p -e "SHOW DATABASES;"

# ตรวจสอบ Backend
curl http://localhost:3002/api/health

# เปิดเบราว์เซอร์
# Frontend: http://localhost
# Backend: http://localhost:3002
```

---

## 🔧 Option 2: Manual Deployment

### ขั้นตอนที่ 1: ติดตั้ง Node.js

**Windows:**

```powershell
# Download Node.js 20.x LTS จาก https://nodejs.org/
# หรือใช้ Chocolatey
choco install nodejs-lts

# ตรวจสอบ
node --version
npm --version
```

**Ubuntu:**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node --version
npm --version
```

### ขั้นตอนที่ 2: ติดตั้ง MySQL

**Windows:**

1. Download MySQL Installer จาก https://dev.mysql.com/downloads/installer/
2. เลือก "Server only" หรือ "Full"
3. ตั้งค่า root password
4. เลือก "Start MySQL Server at System Startup"

**Ubuntu:**

```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
sudo systemctl start mysql
sudo systemctl enable mysql
```

### ขั้นตอนที่ 3: ตั้งค่า Database

```bash
# เข้า MySQL
mysql -u root -p

# สร้าง database และ user
CREATE DATABASE inventory_phoubon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'inventory_user'@'localhost' IDENTIFIED BY 'your_strong_password';

GRANT ALL PRIVILEGES ON inventory_phoubon.* TO 'inventory_user'@'localhost';

FLUSH PRIVILEGES;

EXIT;

# รัน schema
mysql -u inventory_user -p inventory_phoubon < backend/database/schema.sql
```

### ขั้นตอนที่ 4: Deploy Backend

```bash
cd backend

# ติดตั้ง dependencies
npm install --production

# สร้าง .env
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=inventory_user
DB_PASSWORD=your_strong_password
DB_NAME=inventory_phoubon
PORT=3002
NODE_ENV=production
JWT_SECRET=your_random_string_at_least_32_chars_long
EOF

# ทดสอบรัน
npm start

# ถ้าสำเร็จ จะเห็น:
# Server running on port 3002
# Database connected successfully
```

### ขั้นตอนที่ 5: Deploy Backend ด้วย PM2 (แนะนำ)

```bash
# ติดตั้ง PM2
npm install -g pm2

# Start ด้วย PM2
cd backend
pm2 start server.js --name inventory-phoubon-api

# ดู status
pm2 status

# ดู logs
pm2 logs inventory-phoubon-api

# Setup startup script
pm2 startup
pm2 save
```

### ขั้นตอนที่ 6: Deploy Frontend

```bash
cd frontend

# ติดตั้ง dependencies
npm install

# สร้าง .env
cat > .env << EOF
VITE_API_URL=http://your-server-ip:3002
EOF

# Build production
npm run build

# Output จะอยู่ที่ frontend/dist/
```

### ขั้นตอนที่ 7: Serve Frontend ด้วย nginx

**ติดตั้ง nginx (Ubuntu):**

```bash
sudo apt install nginx
```

**ติดตั้ง nginx (Windows):**

Download จาก https://nginx.org/en/download.html

**Config nginx:**

```nginx
# /etc/nginx/sites-available/inventory-phoubon
server {
    listen 80;
    server_name your-domain.com;  # หรือ IP address

    root /path/to/inventory-phoubon/frontend/dist;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

```bash
# Enable site (Ubuntu)
sudo ln -s /etc/nginx/sites-available/inventory-phoubon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 💾 Database Setup

### Schema Overview

ระบบใช้ database schema ที่ประกอบด้วย:

| Table | คำอธิบาย |
|-------|----------|
| `products` | ข้อมูลสินค้า (Master Data) |
| `stock_batches` | สต็อกแยกตาม Lot/Batch |
| `stock_transactions` | ประวัติการรับ/ตัดสต็อก |
| `stock_adjustments` | ประวัติการปรับสต็อก |
| `purchase_orders` | ใบสั่งซื้อ |
| `purchase_order_items` | รายการใน PO |
| `users` | ผู้ใช้งานระบบ |
| `suppliers` | ข้อมูลซัพพลายเออร์ |

### การนำเข้า Master Data

ข้อมูลสินค้ามาจากไฟล์ Excel:

```
ตารางแสดงปริมาณสำรองคงคลังของยาและเวชภัณฑ์.xlsx
```

**ขั้นตอนนำเข้า:**

```bash
cd scripts

# ติดตั้ง Python dependencies
pip install -r requirements.txt

# รัน script
python migrate-master-data.py

# ตรวจสอบ
mysql -u inventory_user -p -e "SELECT COUNT(*) FROM inventory_phoubon.products;"
# ควรได้ ~11,847 รายการ
```

### Backup Database

```bash
# Backup
mysqldump -u inventory_user -p inventory_phoubon > backup_$(date +%Y%m%d).sql

# Restore
mysql -u inventory_user -p inventory_phoubon < backup_20260331.sql
```

### Scheduled Backup (Cron)

```bash
# เพิ่มใน crontab
crontab -e

# Backup ทุกวันเวลา 02:00
0 2 * * * mysqldump -u inventory_user -p'your_password' inventory_phoubon > /backup/inventory_phoubon_$(date +\%Y\%m\%d).sql
```

---

## 🔐 Environment Variables

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_HOST` | ✅ | localhost | MySQL host |
| `DB_PORT` | ✅ | 3306 | MySQL port |
| `DB_USER` | ✅ | - | Database user |
| `DB_PASSWORD` | ✅ | - | Database password |
| `DB_NAME` | ✅ | - | Database name |
| `PORT` | ✅ | 3002 | API server port |
| `NODE_ENV` | ✅ | development | Environment mode |
| `JWT_SECRET` | ✅ | - | JWT signing secret |
| `RATE_LIMIT_WINDOW_MS` | ⬜ | 900000 | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | ⬜ | 100 | Max requests per window |

### Frontend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | ✅ | http://localhost:3002 | Backend API URL |

### Security Best Practices

1. **JWT_SECRET** - ควรเป็น random string อย่างน้อย 32 ตัวอักษร
   ```bash
   # สร้าง random secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Database Password** - ควรเป็น strong password ผสมตัวอักษร ตัวเลข และอักขระพิเศษ

3. **Production Mode** - ตั้งค่า `NODE_ENV=production`

---

## 🔧 Troubleshooting

### ปัญหา: Backend ไม่สามารถเชื่อมต่อ Database

**อาการ:**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**แก้ไข:**
1. ตรวจสอบว่า MySQL ทำงานอยู่:
   ```bash
   # Windows
   net start MySQL80
   
   # Ubuntu
   sudo systemctl status mysql
   sudo systemctl start mysql
   ```

2. ตรวจสอบ credentials ใน `.env`
3. ตรวจสอบว่า user มีสิทธิ์เข้าถึง database:
   ```sql
   GRANT ALL PRIVILEGES ON inventory_phoubon.* TO 'inventory_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### ปัญหา: Frontend ไม่สามารถเรียก API

**อาการ:**
```
Network Error / CORS Error
```

**แก้ไข:**
1. ตรวจสอบว่า Backend ทำงานอยู่
2. ตรวจสอบ `VITE_API_URL` ใน `.env`
3. ตรวจสอบ CORS configuration ใน backend

### ปัญหา: Login ไม่สำเร็จ

**อาการ:**
```
Invalid credentials
```

**แก้ไข:**
1. ตรวจสอบว่ามี default users ใน database:
   ```sql
   SELECT * FROM users;
   ```
2. ถ้าไม่มี ให้รัน seed script:
   ```bash
   cd backend
   node scripts/seed.js
   ```

### ปัญหา: Docker Container ไม่ Start

**อาการ:**
```
Container exits immediately
```

**แก้ไข:**
```bash
# ดู logs
docker-compose logs backend
docker-compose logs mysql

# รีสตาร์ท
docker-compose restart

# ลบและสร้างใหม่
docker-compose down -v
docker-compose up -d --build
```

### ปัญหา: Database Migration ไม่สำเร็จ

**อาการ:**
```
Table doesn't exist
```

**แก้ไข:**
```bash
# รัน schema ใหม่
mysql -u root -p inventory_phoubon < backend/database/schema.sql

# ตรวจสอบ
mysql -u root -p -e "SHOW TABLES FROM inventory_phoubon;"
```

---

## ✅ Production Checklist

### Pre-Deployment

- [ ] เปลี่ยน default passwords (admin123, manager123, etc.)
- [ ] ตั้งค่า `NODE_ENV=production`
- [ ] สร้าง JWT_SECRET ที่ปลอดภัย
- [ ] ตั้งค่า database backup schedule
- [ ] ตั้งค่า HTTPS/SSL certificate
- [ ] ตั้งค่า firewall rules
- [ ] ตรวจสอบ server resources เพียงพอ

### Post-Deployment

- [ ] ทดสอบ login ด้วย default credentials
- [ ] เปลี่ยน default credentials ทันที
- [ ] ทดสอบ API endpoints
- [ ] ทดสอบ frontend functionality
- [ ] ตรวจสอบ logs ไม่มี error
- [ ] ตั้งค่า monitoring/alerting
- [ ] ทดสอบ backup/restore

### Security

- [ ] เปลี่ยน default passwords ทั้งหมด
- [ ] ใช้ HTTPS
- [ ] ปิด ports ที่ไม่จำเป็น
- [ ] ตั้งค่า rate limiting
- [ ] ตรวจสอบ CORS settings
- [ ] Enable audit logging
- [ ] Setup firewall rules

### Monitoring

- [ ] Setup server monitoring
- [ ] Setup application monitoring
- [ ] Setup alerting
- [ ] Configure log rotation
- [ ] Test alert notifications

### Maintenance

- [ ] Setup automated backups
- [ ] Setup log rotation
- [ ] Document rollback procedure
- [ ] Create runbook for common issues
- [ ] Train support staff

---

## 📊 Performance Optimization

### Database

```sql
-- เพิ่ม indexes สำหรับ performance
CREATE INDEX idx_product_code ON products(code);
CREATE INDEX idx_product_name ON products(name);
CREATE INDEX idx_stock_product ON stock_batches(product_id);
CREATE INDEX idx_stock_expiry ON stock_batches(expiry_date);
CREATE INDEX idx_po_status ON purchase_orders(status);
```

### Backend

```javascript
// เปิด connection pooling
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'inventory_user',
  password: 'password',
  database: 'inventory_phoubon'
});
```

### Frontend

```bash
# Build ด้วย optimization
npm run build

# ใช้ CDN สำหรับ static assets
# Configure caching headers ใน nginx
```

---

## 🔄 Upgrade Guide

### Backup ก่อน Upgrade

```bash
# Backup database
mysqldump -u inventory_user -p inventory_phoubon > backup_pre_upgrade.sql

# Backup code
cp -r /path/to/inventory-phoubon /backup/inventory-phoubon_backup
```

### Upgrade Steps

```bash
# 1. Pull latest code
git pull origin main

# 2. Backup current version

# 3. Stop services
docker-compose down
# หรือ
pm2 stop inventory-phoubon-api

# 4. Update dependencies
cd backend && npm install
cd frontend && npm install

# 5. Run migrations (ถ้ามี)
mysql -u inventory_user -p inventory_phoubon < migrations/new_migration.sql

# 6. Restart services
docker-compose up -d
# หรือ
pm2 restart inventory-phoubon-api

# 7. Verify
curl http://localhost:3002/api/health
```

---

## 📞 Support

หากพบปัญหา:

- 📧 Email: support@phoubon-hospital.go.th
- 📞 โทร: 04x-xxx-xxx ต่อ xxxx

---

*Last updated: มีนาคม 2026*