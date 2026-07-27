# 🚀 Hướng Dẫn Deploy AGREEN Lên VPS Qua aaPanel + PostgreSQL

Tài liệu này hướng dẫn từng bước chi tiết từ A-Z để triển khai dự án **AGREEN** (Hệ thống Quản lý Vận hành Cho thuê xe: React SPA + Node.js Express API + PostgreSQL) trên hệ điều hành Linux (Ubuntu/Debian) sử dụng bảng điều khiển **aaPanel**.

---

## 📋 TỔNG QUAN KIẾN TRÚC HỆ THỐNG

- **Frontend**: React (Vite) được build ra thư mục `dist/`.
- **Backend API**: Node.js Express (chạy trên cổng `5000` quản lý bởi PM2). Express trực tiếp phục vụ cả API (`/api/*`), file đính kèm (`/uploads/*`) và trang web tĩnh (`dist/`) với chế độ SPA Fallback.
- **Database**: PostgreSQL (kết nối qua Connection Pool `pg`).
- **Web Server / Reverse Proxy**: Nginx (aaPanel) nhận request từ tên miền và proxy về cổng `5000`, xử lý SSL Let's Encrypt miễn phí.

---

## ⚡ BƯỚC 1: Cài Đặt aaPanel Lên VPS (Chạy 1 Lần Duy Nhất)

1. Mở **SSH Terminal** (bằng PuTTY, Termius hoặc Terminal của máy bạn) kết nối vào VPS với quyền `root`.
2. Lựa chọn lệnh cài đặt phù hợp với HĐH của VPS:

   **Dành cho Ubuntu / Debian (Khuyên dùng):**
   ```bash
   URL=https://www.aapanel.com/script/install_6.0_en.sh && if [ -f /usr/bin/curl ]; then curl -sSO $URL; else wget -O install_6.0_en.sh $URL; fi && bash install_6.0_en.sh aapanel
   ```

   **Dành cho CentOS / AlmaLinux / RockyLinux:**
   ```bash
   yum install -y wget && wget -O install.sh http://www.aapanel.com/script/install_6.0_en.sh && bash install.sh aapanel
   ```

3. Sau khi cài xong, Terminal sẽ in ra thông tin đăng nhập aaPanel:
   - **URL đăng nhập**: `http://<IP_VPS>:<Port>/<Safety_Entry>`
   - **Username** & **Password** ban đầu.

---

## 🛠️ BƯỚC 2: Cài Đặt Môi Trường Trong aaPanel

Đăng nhập vào giao diện web của aaPanel:

1. **Cài đặt Nginx & PostgreSQL**:
   - Tại bảng thông báo LNMP xuất hiện lần đầu (hoặc trong mục **App Store**):
     - Chọn **Nginx** (bản Stable mới nhất).
     - Chọn **PostgreSQL** (hoặc tìm **PostgreSQL Manager** trong App Store).
2. **Cài đặt Node.js Manager**:
   - Vào mục **App Store** ➔ Tìm kiếm **Node.js Version Manager** (hoặc PM2 Manager) và nhấn **Install**.
   - Mở **Node.js Manager** vừa cài ➔ Chọn cài đặt bản **Node.js v20.x LTS** (hoặc v18+).
   - Chọn bản v20 làm **Command line version** (phiên bản mặc định).

---

## 📂 BƯỚC 3: Clone Code Từ GitHub & Build Frontend

Mở **Terminal** tích hợp sẵn trên giao diện aaPanel (hoặc qua SSH):

```bash
# 1. Di chuyển vào thư mục lưu trữ web của aaPanel
cd /www/wwwroot

# 2. Clone dự án từ GitHub
git clone https://github.com/nhanhmediasp/agreen.git

# 3. Di chuyển vào thư mục dự án
cd agreen

# 4. Cài đặt thư viện dependencies
npm install

# 5. Build mã nguồn Frontend
npm run build
```
*(Sau khi build xong, thư mục `dist/` sẽ được tạo ra tự động).*

---

## 🗄️ BƯỚC 4: Khởi Tạo PostgreSQL Database

### 4.1. Tạo Database & User trên giao diện aaPanel
1. Trên menu aaPanel ➔ Chọn mục **Database** ➔ Chuyển sang tab **PostgreSQL**.
2. Nhấn nút **Add Database**:
   - **DB Name**: `agrenn_sql` *(hoặc tên bạn muốn)*
   - **Username**: `agrenn_sql`
   - **Password**: `[Nhập mật khẩu an toàn của bạn]`
   - **Access Permission**: Localhost (127.0.0.1)
3. Nhấn **Submit** để tạo.

### 4.2. Import CSDL (Schema & Seed Data)
Trong Terminal VPS, thực hiện lệnh import cấu trúc bảng và dữ liệu mẫu:

```bash
cd /www/wwwroot/agreen

# Start service PostgreSQL nếu chưa bật
systemctl start postgresql

# Import cấu trúc bảng (Schema) với tham số host -h 127.0.0.1
psql -h 127.0.0.1 -U agrenn_sql -d agrenn_sql -f database/schema.sql

# Import dữ liệu mẫu ban đầu (Seed)
psql -h 127.0.0.1 -U agrenn_sql -d agrenn_sql -f database/seed.sql
```
*(Nếu hệ thống hỏi mật khẩu, nhập mật khẩu CSDL bạn vừa tạo ở Bước 4.1).*

---

## 🚀 BƯỚC 5: Cấu Hình Môi Trường & Khởi Chạy Backend API (PM2)

1. **Tạo file cấu hình `.env`**:
   ```bash
   cd /www/wwwroot/agreen
   cp .env.example .env
   ```

2. **Chỉnh sửa file `.env`**:
   Bạn có thể mở file `.env` bằng lệnh `nano .env` hoặc dùng trình quản lý file của aaPanel tại `/www/wwwroot/agreen/.env`:

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=production

   # PostgreSQL Database Configuration
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=agrenn_sql
   DB_PASSWORD=MẬT_KHẨU_DB_CỦA_BẠN
   DB_NAME=agrenn_sql

   # Security & CORS
   JWT_SECRET=super_secret_jwt_key_agreen
   CORS_ORIGIN=*
   ```

3. **Khởi chạy ứng dụng bằng PM2**:
   ```bash
   # Cài đặt pm2 toàn cục (nếu chưa có)
   npm install -g pm2

   # Khởi chạy server Node.js
   pm2 start server/server.js --name "agreen-api"

   # Lưu danh sách tiến trình PM2 để tự khởi động lại khi reboot VPS
   pm2 save
   pm2 startup
   ```

4. **Kiểm tra trạng thái**:
   ```bash
   pm2 status
   # Hoặc xem log server
   pm2 logs agreen-api --lines 50
   ```

---

## 🌐 BƯỚC 6: Thêm Website & Cấu Hình Nginx Proxy + SSL

1. **Tạo Website trên aaPanel**:
   - Vào mục **Website** ➔ Chọn **Add site**.
   - **Domain**: `agreen.info.vn` *(thay bằng tên miền của bạn)*.
   - **Document Root**: `/www/wwwroot/agreen` *(Lưu ý: KHÔNG chọn `/dist`)*.
   - **FTP / Database**: Không cần chọn (vì đã tạo ở Bước 4).
   - **PHP Version**: Pure static / No PHP.
   - Nhấn **Submit**.

2. **Cấu hình Nginx Reverse Proxy**:
   - Trong danh sách Website ➔ Nhấp vào tên miền vừa tạo để mở hộp thoại cài đặt.
   - Chọn tab **URL rewrite** hoặc **Config** (Cấu hình Nginx).
   - Thay thế hoặc bổ sung cấu hình sau vào trong file config:

   > ⚠️ **LƯU Ý CỰC KỲ QUAN TRỌNG TRÊN AAPANEL:**
   > Mặc định aaPanel tự động thêm 2 đoạn `location ~ .*\.(js|css)?$` và `location ~ .*\.(gif|jpg...)$`. Đoạn này sẽ **chặn Nginx gửi request file JS/CSS sang Express**, khiến web bị **TRẮNG MÀN HÌNH**!
   > **Bạn PHẢI xóa hoặc comment out (`#`) 2 đoạn location đó đi.**

   ```nginx
   server {
       listen 80;
       server_name agreen.info.vn; # Thay tên miền của bạn
       index index.html index.htm;
       root /www/wwwroot/agreen;

       # Giới hạn dung lượng upload file (ảnh xe, hợp đồng)
       client_max_body_size 20M;

       # Dynamic Proxy sang Backend Express (Port 5000)
       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }

       # KHÔNG ĐỂ 2 ĐOẠN NÀY (BẮT BUỘC COMMENT OUT HOẶC XÓA):
       # location ~ .*\.(js|css)?$ { ... }
       # location ~ .*\.(gif|jpg...)?$ { ... }
   }
   ```

3. **Cài Đặt SSL Miễn Phí (HTTPS)**:
   - Trong hộp thoại cài đặt Website ➔ Chuyển sang tab **SSL**.
   - Chọn tab **Let's Encrypt**.
   - Tích chọn tên miền của bạn ➔ Nhấn **Apply**.
   - Sau khi thành công, tích chọn **Force HTTPS** để tự động chuyển hướng HTTP sang HTTPS.

---

## 🔄 BƯỚC 7: Hướng Dẫn Cập Nhật Code Sau Này (Update Deployment)

Khi bạn đẩy code mới lên GitHub và muốn cập nhật trên VPS:

```bash
cd /www/wwwroot/agreen

# 1. Kéo code mới nhất từ GitHub
git pull origin main

# 2. Cài thêm gói phụ thuộc (nếu có)
npm install

# 3. Build lại Frontend
npm run build

# 4. Restart lại tiến trình PM2
pm2 restart agreen-api
```

---

## ❓ XỬ LÝ LỖI PHỔ BIẾN (TROUBLESHOOTING)

| Hiện Tượng Lỗi | Nguyên Nhân Phổ Biến | Cách Khắc Phục |
| :--- | :--- | :--- |
| **502 Bad Gateway** | Tiến trình PM2 chưa chạy hoặc cổng 5000 bị crash. | Chạy `pm2 status` hoặc `pm2 logs agreen-api` để kiểm tra lỗi log. |
| **Lỗi kết nối DB (`ECONNREFUSED` / Auth Failed)** | Sai thông tin mật khẩu DB trong `.env` hoặc service PostgreSQL chưa bật. | Kiểm tra file `.env`, dùng lệnh `systemctl status postgresql` để kiểm tra DB. |
| **Không tải được file Uploads** | Thư mục `public/uploads` thiếu quyền ghi. | Chạy lệnh `chmod -R 777 /www/wwwroot/agreen/public/uploads`. |
| **Trang bị 404 khi F5 refresh** | Nginx chưa proxy toàn bộ request sang Express hoặc sai SPA fallback. | Đảm bảo đoạn config Nginx `proxy_pass http://127.0.0.1:5000` được áp dụng đúng. |

---

🎉 **HOÀN TẤT!** Ứng dụng **AGREEN** hiện tại đã hoạt động ổn định trên VPS với aaPanel, PostgreSQL và HTTPS SSL!
