# Hướng Dẫn Tối Ưu & Deploy Website Lên VPS Qua VPanel (PostgreSQL)

Tài liệu này chi tiết các bước kéo code từ GitHub và triển khai ứng dụng **AGREEN** lên VPS sử dụng bảng quản trị **VPanel** (https://vpanel.vn) với cơ sở dữ liệu **PostgreSQL**.

---

## 🚀 Hướng Dẫn Kéo Code Từ GitHub Về VPanel & Triển Khai (Từng Bước)

### Phương Án 1: Kéo Code Trực Tiếp Bằng SSH Terminal VPS (Khuyên Dùng)

#### Bước 1: Mở SSH Terminal trên VPS và Clone Code từ GitHub
```bash
# Di chuyển vào thư mục chứa web của VPanel
cd /var/www

# Git clone repo agreen từ GitHub
git clone https://github.com/nhanhmediasp/agreen.git

# Di chuyển vào thư mục dự án
cd agreen
```

#### Bước 2: Cài đặt Node dependencies & Build Frontend
```bash
# Cài đặt các gói thư viện
npm install

# Build mã nguồn Frontend ra thư mục dist/
npm run build
```

#### Bước 3: Khởi Tạo Database PostgreSQL Trên VPanel & Import Data
1. Đăng nhập vào giao diện **VPanel** trên trình duyệt.
2. Vào mục **Databases** ➔ chọn **PostgreSQL** ➔ Nhấn **Tạo Database mới**:
   - **Database Name:** `vpanel_car_rental`
   - **Username:** `vpanel_car_user`
   - **Password:** `[Nhập mật khẩu của bạn]`
3. Quay lại SSH Terminal chạy lệnh import cấu trúc bảng & dữ liệu mẫu:
   ```bash
   psql -U vpanel_car_user -d vpanel_car_rental -f database/schema.sql
   psql -U vpanel_car_user -d vpanel_car_rental -f database/seed.sql
   ```

#### Bước 4: Khởi Chạy Backend API (Node.js + Express) với PM2
```bash
# Tạo file .env môi trường
cp .env.example .env

# Sửa thông tin DB_PASSWORD trong file .env
nano .env

# Cài đặt PM2 (nếu VPS chưa có) và khởi chạy Backend API
npm install -g pm2
pm2 start server/server.js --name "agreen-api"
pm2 save
pm2 startup
```

#### Bước 5: Cấu Hình Website Trên VPanel & Nginx
1. Trực tiếp trên web **VPanel**, vào mục **Websites** ➔ **Thêm Website mới**.
2. Nhập tên miền (ví dụ: `quantlyxe.vn`).
3. Đặt **Document Root** trỏ tới thư mục `dist`:
   `/var/www/agreen/dist`
4. Vào mục **Cấu hình Nginx / Nginx Config** trong VPanel, dán toàn bộ nội dung từ file `nginx.conf`:
   ```nginx
   server {
       listen 80;
       server_name quantlyxe.vn www.quantlyxe.vn;

       root /var/www/agreen/dist;
       index index.html;

       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

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

       location /assets/ {
           expires 1y;
           add_header Cache-Control "public, no-transform, immutable";
       }
   }
   ```
5. Bật **SSL miễn phí (Let's Encrypt)** trong VPanel chỉ với 1-click.

---

### Phương Án 2: Sử Dụng Tính Năng Git Integration Trong Giao Diện VPanel (Nếu Có)

1. Đăng nhập **VPanel** ➔ Vào **Websites** ➔ Tạo website với Document Root là `/var/www/agreen/dist`.
2. Vào mục **Git / Repository** trong VPanel ➔ Nhập URL GitHub:
   `https://github.com/nhanhmediasp/agreen.git`
3. Nhấn **Pull / Deploy**.
4. Mở SSH Terminal hoặc Terminal trong VPanel chạy:
   ```bash
   cd /var/www/agreen
   npm install
   npm run build
   pm2 start server/server.js --name "agreen-api"
   ```

---

## 3. Kiểm Tra & Xác Nhận Hiệu Năng
- **Build**: `npm run build` tạo các file tĩnh JS/CSS nén tối đa tại `dist/`.
- **Backend Healthcheck**: Truy cập `http://domain.com/api/health` hoặc `http://IP_VPS:5000/api/health` để xác nhận Backend kết nối thành công tới PostgreSQL.
- **Nginx Response**: Điều hướng giữa các trang (/contracts, /fleet) mượt mà không bị lỗi 404.
