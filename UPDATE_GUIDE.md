# Hướng Dẫn Cập Nhật Ứng Dụng (UPDATE GUIDE)

Tài liệu này hướng dẫn cách cập nhật, bảo trì, và deploy ứng dụng Quản lý Vận hành Xe AGREEN lên môi trường Production.

## 1. Cấu Trúc Hệ Thống Hiện Tại

- **Frontend**: React (Vite)
- **Backend**: Node.js/Express (chạy tại cổng 3001)
- **Database**: PostgreSQL (kết nối thông qua connection pool trong `server.js`)
- **Quản lý Auth**: Mật khẩu được mã hóa băm SHA-256 qua API, lưu trong bảng `users` của PostgreSQL.

## 2. Các Bước Cập Nhật Lên Production

Khi có thay đổi từ nhánh phát triển (development), bạn thực hiện các bước sau để cập nhật Production:

### Bước 1: Lấy code mới nhất (Pull)
```bash
git pull origin main
```

### Bước 2: Cài đặt dependencies (Nếu có thay đổi package.json)
```bash
# Cho Backend
npm install

# Cho Frontend (nếu tách riêng)
npm install
```

### Bước 3: Cập nhật Database (Migration)
Nếu có sự thay đổi về cấu trúc Database (thêm bảng, sửa cột):
1. Chạy các file SQL thủ công trong thư mục `database/` (hoặc thông qua psql).
2. Kiểm tra lại pool connection ở `server/server.js` có đúng `DB_URL` của server không.

### Bước 4: Build Frontend
Dự án sử dụng Vite để build frontend:
```bash
npm run build
```
Lệnh này sẽ tạo ra thư mục `dist/`. Thư mục này sau đó được cấu hình để phục vụ như thư mục static bởi Express (hoặc Nginx).

### Bước 5: Khởi động lại Backend
Sử dụng PM2 hoặc systemd để quản lý tiến trình backend:
```bash
# Nếu dùng PM2
pm2 restart agreen-server

# Hoặc tải lại không gián đoạn
pm2 reload agreen-server
```

---

## 3. Quản Lý Tài Khoản (Security)

Hệ thống đã loại bỏ mật khẩu plaintext và chuyển sang lưu trữ hash trong PostgreSQL. 
Để đổi mật khẩu tài khoản Admin hoặc thêm người dùng, hãy dùng giao diện Cài đặt (Settings) trên ứng dụng, hoặc dùng SQL:

```sql
-- Ví dụ đổi mật khẩu thủ công bằng băm SHA-256
UPDATE users SET password_hash = encode(digest('mat_khau_moi', 'sha256'), 'hex') WHERE username = 'admin';
```
> **Lưu ý**: Hãy đảm bảo extension `pgcrypto` đã được cài đặt trên database của bạn (`CREATE EXTENSION pgcrypto;`).

## 4. Xử Lý Lỗi Phổ Biến

1. **Lỗi không kết nối được Database (`ECONNREFUSED`)**:
   - Kiểm tra PostgreSQL service có đang chạy không: `sudo systemctl status postgresql`
   - Đảm bảo biến môi trường `DB_URL` hoặc cấu hình chuỗi kết nối trong `server.js` chính xác.

2. **Lỗi `Invalid Password` khi đăng nhập dù nhập đúng**:
   - Kiểm tra xem mật khẩu có đang được hash đúng SHA-256 không.
   - Nếu đăng nhập lần đầu sau khi migrate từ JSON lên DB, hệ thống sẽ tự động seed tài khoản admin với mật khẩu `agreen2025`.

3. **Lỗi "Not Found" khi refresh trang (Frontend)**:
   - Hãy chắc chắn Express đang dùng file `index.html` như một fallback cho các route React (SPA fallback):
     ```javascript
     app.get('*', (req, res) => {
         res.sendFile(path.join(__dirname, '../dist/index.html'));
     });
     ```

## 5. Sao Lưu Dữ Liệu (Backup)
Để sao lưu dữ liệu toàn bộ hệ thống (Backup PostgreSQL):
```bash
pg_dump -U postgres -d agreen_db > agreen_backup_$(date +%Y%m%d).sql
```
Khuyên dùng cronjob tự động chạy lệnh này hàng ngày và lưu trữ sang ổ đĩa khác.
