# 🚗 AGREEN - Hệ Thống Quản Trị Cho Thuê Xe Tự Lái (Car Rental Dashboard)

Hệ thống quản lý và tra cứu thông tin cho thuê xe tự lái toàn diện dành cho các đơn vị kinh doanh vận tải/cho thuê xe. Dự án được tối ưu hóa đầy đủ để triển khai trên **aaPanel (VPS)** kết hợp cơ sở dữ liệu **PostgreSQL** và backend **Node.js (Express)**.

---

## 🛠️ Kiến Trúc Hệ Thống (Tech Stack)

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 8](https://vite.dev/), [Lucide React](https://lucide.dev/)
- **Backend API:** Node.js, Express.js, `pg` (PostgreSQL client with Pool optimization)
- **Database:** PostgreSQL (Hỗ trợ UUID, B-Tree & GIN Trigram Indexing cho tìm kiếm siêu nhanh)
- **Web Server & Reverse Proxy:** Nginx (Cấu hình SPA routing & Gzip compression)
- **Control Panel:** aaPanel (https://www.aapanel.com)

---

## ⚡ Hướng Dẫn Chạy Cục Bộ (Local Development)

### 1. Cài đặt phụ thuộc:
```bash
npm install
```

### 2. Khởi chạy Frontend & Backend:
- **Chạy Frontend (React + Vite):**
  ```bash
  npm run dev
  ```
  *(Truy cập: `http://localhost:5173`)*

- **Chạy Backend API (Node.js Express):**
  ```bash
  npm run start
  ```
  *(API Server chạy tại: `http://localhost:5000`)*

---

## 🌐 Hướng Dẫn Deploy Lên VPS Qua aaPanel + PostgreSQL

### 1. Cài đặt aaPanel lên VPS (Ubuntu/Debian)
```bash
URL=https://www.aapanel.com/script/install_6.0_en.sh && if [ -f /usr/bin/curl ]; then curl -sSO $URL; else wget -O install_6.0_en.sh $URL; fi && bash install_6.0_en.sh aapanel
```

### 2. Kéo code từ GitHub về aaPanel
```bash
cd /www/wwwroot
git clone https://github.com/nhanhmediasp/agreen.git
cd agreen
npm install
npm run build
```

### 3. Tạo PostgreSQL DB & Khởi chạy Backend PM2
```bash
# Nạp CSDL
psql -U vpanel_car_user -d vpanel_car_rental -f database/schema.sql
psql -U vpanel_car_user -d vpanel_car_rental -f database/seed.sql

# Khởi chạy API Backend
cp .env.example .env
pm2 start server/server.js --name "agreen-api"
```

### 4. Cấu hình Website trong aaPanel
- Vào **Website** ➔ Add Site với tên miền của bạn.
- Đặt **Running Directory** là `/dist`.
- Cấu hình **Nginx Rewrite**:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  location /api/ {
      proxy_pass http://127.0.0.1:5000/api/;
  }
  ```
- Bật **SSL Let's Encrypt (Miễn phí)**.

---

## 📁 Cấu Trúc Thư Mục Dự Án (Flat Root Layout)

```text
/
├── database/               # PostgreSQL Schema & Seed Data SQL scripts
├── server/                 # Backend Node.js Express API
├── public/                 # Assets tĩnh (favicon, icons)
├── src/                    # Source code React Frontend
├── .env.example            # File mẫu cấu hình môi trường VPS/Local
├── nginx.conf              # Cấu hình Web Server Nginx chuẩn cho aaPanel
├── package.json            # Scripts & Dependencies (React 19, Express, pg, v.v.)
├── vite.config.ts          # Vite build config & Manual Chunk Splitting
└── AAPANEL_DEPLOYMENT.md   # Hướng dẫn triển khai aaPanel chi tiết A-Z
```
