# 🚗 AGREEN - Hệ Thống Quản Trị Cho Thuê Xe Tự Lái (Car Rental Dashboard)

Hệ thống quản lý và tra cứu thông tin cho thuê xe tự lái toàn diện dành cho các đơn vị kinh doanh vận tải/cho thuê xe. Dự án được tối ưu hóa đầy đủ để triển khai trên **VPanel (VPS)** kết hợp cơ sở dữ liệu **PostgreSQL** và backend **Node.js (Express)**.

---

## 🛠️ Kiến Trúc Hệ Thống (Tech Stack)

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 8](https://vite.dev/), [Lucide React](https://lucide.dev/)
- **Backend API:** Node.js, Express.js, `pg` (PostgreSQL client with Pool optimization)
- **Database:** PostgreSQL (Hỗ trợ UUID, B-Tree & GIN Trigram Indexing cho tìm kiếm siêu nhanh)
- **Web Server & Reverse Proxy:** Nginx (Cấu hình SPA routing & Gzip compression)
- **Process Manager:** PM2 (Quản lý tiến trình Node.js ngầm trên VPS)
- **Deployment Platform:** VPanel Manager (https://vpanel.vn)

---

## ⚡ Hướng Dẫn Chạy Cục Bộ (Local Development)

### 1. Cài đặt phụ thuộc:
```bash
npm install
```

### 2. Khởi tạo file môi trường (`.env`):
Tạo file `.env` từ file mẫu `.env.example`:
```env
PORT=5000
NODE_ENV=development

# PostgreSQL Database Configuration
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=vpanel_car_rental

# Connection String Alternative
DATABASE_URL=postgresql://postgres:your_password@127.0.0.1:5432/vpanel_car_rental?sslmode=disable
```

### 3. Khởi chạy Frontend & Backend:
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

## 🌐 Hướng Dẫn Deploy Lên VPS Qua VPanel + PostgreSQL

Codebase đã được tối ưu sẵn sàng 100% để chạy trên **VPanel**. Các bước triển khai chi tiết:

### Bước 1: Khởi Tạo Database PostgreSQL Trên VPanel
1. Đăng nhập vào bảng quản trị **VPanel** trên VPS.
2. Vào mục **Databases** ➔ chọn **PostgreSQL** ➔ Nhấn **Tạo Database mới**:
   - **Database Name:** `vpanel_car_rental`
   - **Username:** `vpanel_car_user`
   - **Password:** `[Đặt mật khẩu mạnh của bạn]`
3. Mở pgAdmin hoặc chạy lệnh SSH trên VPS để import CSDL:
   ```bash
   # Import cấu trúc bảng & chỉ mục (Indexes)
   psql -U vpanel_car_user -d vpanel_car_rental -f database/schema.sql

   # (Tùy chọn) Import dữ liệu mẫu ban đầu
   psql -U vpanel_car_user -d vpanel_car_rental -f database/seed.sql
   ```

### Bước 2: Build Frontend Trên VPS Hoặc Máy Cục Bộ
```bash
npm run build
```
*(Thư mục xuất ra mã nguồn đã tối ưu là `dist/`).*

### Bước 3: Cấu Hình Website Trên VPanel
1. Vào **Websites** ➔ **Thêm Website mới** (nhập tên miền của bạn).
2. Đặt **Document Root** trỏ thẳng tới thư mục `dist`:
   `/var/www/agreen/dist`
3. Vào mục **Cấu hình Nginx (Nginx Config)** trong VPanel, dán cấu hình từ file `nginx.conf`:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }

   location /api/ {
       proxy_pass http://127.0.0.1:5000/api/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
   }
   ```
4. Bật **SSL miễn phí (Let's Encrypt)** trực tiếp trên VPanel với 1 click.

### Bước 4: Khởi Chạy Backend Node.js API bằng PM2
```bash
# Tạo file .env và cập nhật thông tin PostgreSQL
cp .env.example .env
nano .env

# Khởi chạy ứng dụng với PM2
npm install -g pm2
pm2 start server/server.js --name "agreen-api"
pm2 save
pm2 startup
```

---

## ✨ Các Tính Năng Nổi Bật

1. **Bảng Điều Khiển (Dashboard):** Thống kê trạng thái xe (Ready, Rented, Maintenance), cảnh báo hạn đăng kiểm/bảo hiểm, timeline lịch trình tuần.
2. **Quản Lý Xe & Chủ Xe:** Quản lý danh sách phương tiện, cấu hình giá thuê (Giờ/Ngày/Tuần), quản lý đối tác ký gửi xe.
3. **Tạo Đơn Thuê & Hợp Đồng:** Đặt xe đa bước, tự động tính chi phí & phụ phí cuối tuần, quản lý KM và nhiên liệu bàn giao.
4. **Quản Lý Khách Hàng & Chi Phí:** Phân loại khách hàng (Normal, VIP, Warning), theo dõi nhật ký phạt nguội, ghi nhận chi phí vận hành.
5. **Cổng Tra Cứu Đối Tác Công Khai (`/status`):** Chủ xe tự tra cứu tình trạng xe qua biển số và SĐT mà không cần tài khoản admin.
6. **Báo Cáo & Phân Tích:** Thống kê doanh thu, chi phí, lợi nhuận ròng và hiệu suất khai thác xe.

---

## 🔒 Tài Khoản Đăng Nhập Mặc Định

- **Username:** `admin`
- **Password:** `admin123`

---

## 📁 Cấu Trúc Thư Mục Dự Án (Flat Root Layout)

```text
/
├── database/               # PostgreSQL Schema & Seed Data SQL scripts
│   ├── schema.sql          # Bảng, Ràng buộc, Triggers & Indexing
│   └── seed.sql            # Dữ liệu mẫu khởi tạo
├── server/                 # Backend Node.js Express API
│   ├── db.js               # PostgreSQL connection pool tuning
│   └── server.js           # Express API endpoints (/api/health, /api/vehicles, v.v.)
├── public/                 # Assets tĩnh (favicon, icons)
├── src/                    # Source code React Frontend
│   ├── components/         # Reusable UI components
│   ├── context/            # Global state (AppContext.tsx)
│   ├── pages/              # Các trang quản trị (Dashboard, Fleet, Contracts, v.v.)
│   ├── App.tsx             # Routing & Layout
│   ├── main.tsx            # React Entry point
│   └── index.css           # Global Design Tokens & Tailwind-free CSS
├── .env.example            # File mẫu cấu hình môi trường VPS/Local
├── nginx.conf              # Cấu hình Web Server Nginx chuẩn cho VPanel
├── package.json            # Scripts & Dependencies (React 19, Express, pg, v.v.)
├── vite.config.ts          # Vite build config & Manual Chunk Splitting
└── VPANEL_DEPLOYMENT.md    # Hướng dẫn triển khai VPanel nâng cao
```

---

## 📝 Bản Quyền

Dự án **AGREEN** được phát triển phục vụ công tác quản lý vận tải và cho thuê xe tự lái.
