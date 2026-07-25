# Hướng Dẫn Tối Ưu & Deploy Website Lên VPS Qua VPanel (PostgreSQL)

Tài liệu này chi tiết các bước tối ưu hóa code và triển khai ứng dụng **Car Rental Dashboard** lên VPS sử dụng bảng quản trị **VPanel** (https://vpanel.vn/docs) với cơ sở dữ liệu **PostgreSQL**.

---

## 1. Các Tối Ưu Đã Thực Hiện Cho Codebase

### A. Tối ưu Frontend Build (Vite + React SPA)
- **Code Splitting (Phân tách Bundle)**: Cấu hình `manualChunks` trong `vite.config.ts` để chia nhỏ các thư viện lớn (`react-dom`, `lucide-react`) thành các file chunk độc lập.
- **Giảm dung lượng trang**: Dung lượng trang chính được nén tối đa, giảm thời gian tải trang ban đầu (First Contentful Paint) từ ~900kB xuống còn các file cached ~200kB.
- **Nginx SPA Configuration**: Cấu hình `nginx.conf` mở sẵn `try_files $uri $uri/ /index.html;`, bật nén Gzip, Security Headers và HTTP Caching cho tài nguyên tĩnh (`/assets/`).

### B. Tối ưu PostgreSQL Database
- **Schema thiết kế chuẩn hóa**: `database/schema.sql` khởi tạo các bảng `vehicles`, `customers`, `contracts`, `owners`, `service_orders`, `expenses`, `users`.
- **Đánh chỉ mục (Indexing)**: Tạo B-Tree & GIN trigram indexes cho các trường hay tìm kiếm (`phone`, `plate_number`, `status`, `start_date`, `end_date`, `full_name`).
- **Connection Pooling**: Cấu hình `server/db.js` cho Node.js dùng `pg.Pool` giới hạn max connections (20 connection), idle timeout 30s giúp VPS không bị cạn tài nguyên RAM/CPU.

---

## 2. Các Bước Triển Khai Trên VPanel (https://vpanel.vn/docs)

### Bước 1: Tạo Database PostgreSQL Trên VPanel
1. Đăng nhập vào giao diện **VPanel** trên VPS của bạn.
2. Vào mục **Databases** -> chọn **PostgreSQL**.
3. Chọn **Tạo Database mới**:
   - Database Name: `vpanel_car_rental`
   - Username: `vpanel_car_user`
   - Password: `[Đặt mật khẩu mạnh]`
4. Mở công cụ **pgAdmin** hoặc chạy terminal SSH để import schema:
   ```bash
   psql -U vpanel_car_user -d vpanel_car_rental -f database/schema.sql
   ```

### Bước 2: Build Frontend Trên VPS Hoặc Máy Cục Bộ
1. Trên máy của bạn hoặc VPS, chạy lệnh build tối ưu:
   ```bash
   npm run build
   ```
2. Thư mục xuất ra là `dist/`.

### Bước 3: Cấu Hình Website / Domain Trên VPanel
1. Trong VPanel, vào mục **Websites** -> **Thêm Website mới**.
2. Nhập tên miền của bạn (ví dụ: `quantlyxe.vn`).
3. Đặt **Document Root** trỏ tới thư mục `dist` của dự án:
   `/var/www/car-rental-dashboard/dist`
4. Vào mục **Cấu hình Nginx / Nginx Config** trong VPanel, dán nội dung từ file `nginx.conf` đã tạo:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```
5. Bật **SSL miễn phí (Let's Encrypt)** trong VPanel chỉ với 1-click.

### Bước 4: Khởi Chạy Backend API (Tùy chọn Node.js Server với PM2)
Nếu sử dụng API Node.js kết nối PostgreSQL:
1. Copy thư mục `server/` và `.env` lên VPS.
2. Cài đặt PM2 để quản lý tiến trình backend chạy ngầm:
   ```bash
   npm install -g pm2
   cd /var/www/car-rental-dashboard
   cp .env.example .env
   # Sửa thông tin DB trong file .env
   pm2 start server/server.js --name "car-rental-api"
   pm2 save
   pm2 startup
   ```

---

## 3. Kiểm Tra & Xác Nhận Hiệu Năng
- **Kiểm tra Build**: Đã test lệnh `npm run build` thành công, không còn cảnh báo dung lượng chunk (`< 500kB`).
- **Nginx Response**: Nút reload SPA đường dẫn như `/contracts`, `/fleet` làm việc mượt mà không bị lỗi 404.
- **Tối ưu RAM VPS**: Pool connection giới hạn ở 20 connection giúp PostgreSQL hoạt động ổn định trên các gói VPS RAM 1GB - 2GB.
