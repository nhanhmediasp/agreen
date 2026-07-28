# Hướng Dẫn Deploy Website Lên VPS Qua aaPanel (PostgreSQL)

Tài liệu này hướng dẫn chi tiết từng bước cài đặt **aaPanel** trên VPS và triển khai ứng dụng **AGREEN** (React SPA + Node.js Express API + PostgreSQL).

---

## ⚡ BƯỚC 1: Cài Đặt aaPanel Lên VPS (Làm 1 Lần Duy Nhất)

Mở **SSH Terminal** kết nối vào VPS (Ubuntu/Debian) và dán lệnh sau để cài aaPanel:

```bash
URL=https://www.aapanel.com/script/install_6.0_en.sh && if [ -f /usr/bin/curl ]; then curl -sSO $URL; else wget -O install_6.0_en.sh $URL; fi && bash install_6.0_en.sh aapanel
```

*Sau khi cài xong, Terminal sẽ in ra đường dẫn đăng nhập aaPanel, Username và Password (ví dụ: `http://IP_VPS:8888/xxxx`).*

---

## 🛠️ BƯỚC 2: Cài Đặt Các Môi Trường Cần Thiết Trong aaPanel

Đăng nhập vào giao diện web aaPanel:

1. Tại bảng hỏi LNMP hiện ra ngay khi vào (hoặc mục **App Store**):
   - Cài đặt **Nginx** (Phiên bản mới nhất).
   - Cài đặt **PostgreSQL** (PostgreSQL Manager trong App Store).
2. Vào mục **App Store** ➔ Tìm kiếm và cài đặt **Node.js Version Manager** (hoặc PM2 Manager).
3. Trong **Node.js Manager**: Chọn cài bản **Node.js v20.x** LTS.

---

## 📂 BƯỚC 3: Kéo Code Từ GitHub Về aaPanel

Mở **Terminal** trong aaPanel (hoặc SSH Terminal):

```bash
# 1. Di chuyển vào thư mục web của aaPanel
cd /www/wwwroot

# 2. Clone mã nguồn agreen từ GitHub về
git clone https://github.com/nhanhmediasp/agreen.git

# 3. Di chuyển vào agreen và cài phụ thuộc + build
cd agreen
npm install
npm run build
```

---

## 🗄️ BƯỚC 4: Tạo PostgreSQL Database & Import Data Trong aaPanel

1. Trực tiếp trên aaPanel ➔ Chọn mục **Database** ➔ Chọn tab **PostgreSQL**:
   - Nhấn **Add Database**:
     - **DB Name:** `vpanel_car_rental`
     - **Username:** `vpanel_car_user`
     - **Password:** `[Đặt mật khẩu của bạn]`
2. Import CSDL (qua Terminal):
   ```bash
   cd /www/wwwroot/agreen
   psql -U vpanel_car_user -d vpanel_car_rental -f database/schema.sql
   npm run migrate
   ```

---

## 🚀 BƯỚC 5: Khởi Chạy Backend API (Node.js Express)

1. Tạo file `.env` môi trường:
   ```bash
   cd /www/wwwroot/agreen
   cp .env.example .env
   # Điền DB_*, JWT_SECRET, CORS_ORIGIN và mật khẩu bootstrap một lần
   nano .env
   ```
2. Khởi chạy Backend bằng PM2:
   ```bash
   pm2 start server/server.js --name "agreen-api"
   pm2 save
   ```

Không có tài khoản/mật khẩu admin mặc định. Xem `UPDATE_GUIDE.md` để bootstrap
admin, backup/migration, rotate secret và chạy kiểm tra trước khi phát hành.

---

## 🌐 BƯỚC 6: Tạo Website & Cấu Hình Nginx Trên aaPanel

1. Trên aaPanel ➔ Chọn mục **Website** ➔ **Add site**:
   - **Domain:** `agreen.info.vn` (hoặc tên miền của bạn).
   - **Document Root:** `/www/wwwroot/agreen`
2. Nhấp vào tên miền vừa tạo ➔ Vào mục **Config (Cấu hình Nginx)** dán đoạn mã sau vào:
   ```nginx
   client_max_body_size 20M;

   # Proxy mọi thứ sang Node.js Express (cổng 5000)
   # Express phục vụ cả API (/api/*) lẫn Frontend (dist/) trên cùng 1 cổng
   location / {
       proxy_pass http://127.0.0.1:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```
   > **Lưu ý:** Không cần đổi Running Directory thành `/dist` nữa vì Express tự phục vụ thư mục `dist/`.
4. Vào mục **SSL** ➔ Chọn tab **Let's Encrypt** ➔ Tích chọn tên miền ➔ Nhấn **Apply** để bật HTTPS miễn phí!

---

🎉 **HOÀN TẤT!** Bạn có thể truy cập `https://agreen.info.vn` ngay lập tức!
