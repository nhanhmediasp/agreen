# Hướng dẫn cập nhật AGREEN

Tài liệu này áp dụng cho bản React + Express + PostgreSQL có xác thực bằng cookie
HttpOnly. Không chạy các lệnh dưới đây trực tiếp trên production trước khi đã sao lưu
và kiểm tra trên một database staging/restore riêng.

## 1. Biến môi trường bắt buộc

Sao chép `.env.example` thành `.env` trên máy chủ và thay toàn bộ placeholder:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: kết nối PostgreSQL.
- `JWT_SECRET`: chuỗi ngẫu nhiên riêng, tối thiểu 32 ký tự; không dùng lại giữa các
  môi trường.
- `CORS_ORIGIN`: danh sách origin HTTPS được phép, phân tách bằng dấu phẩy. Không
  dùng `*` vì API dùng cookie credentials.
- `AUTH_TOKEN_TTL_SECONDS`: thời hạn phiên, mặc định 8 giờ.
- `TRUST_PROXY_HOPS`: số proxy đáng tin cậy trước Express; thường là `1` khi có
  đúng một Nginx reverse proxy.

Chỉ khi bảng `users` đang trống, đặt tạm:

- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_FULL_NAME`
- `BOOTSTRAP_ADMIN_PASSWORD`: tối thiểu 12 ký tự, có chữ hoa, chữ thường, số và
  ký tự đặc biệt.

Khởi động server một lần để tạo admin đầu tiên, xác nhận đăng nhập được rồi xóa
`BOOTSTRAP_ADMIN_PASSWORD` khỏi runtime environment. Server không có mật khẩu
admin mặc định và không ghi mật khẩu ra log.

## 2. Backup và migration

Tạo backup bằng tài khoản có quyền phù hợp:

```bash
pg_dump --format=custom --file=agreen_before_20260728.dump "$DATABASE_URL"
```

Khôi phục bản backup vào database kiểm thử riêng, cấu hình các biến `DB_*` trỏ tới
database đó rồi chạy:

```bash
npm ci
npm run test:migration
npm run migrate
```

`npm run migrate` tạo ledger `schema_migrations`, lưu tên file và SHA-256 checksum,
rồi chỉ áp dụng mỗi file đúng một lần trong transaction. Nếu nội dung một migration
đã áp dụng bị sửa, runner dừng với lỗi checksum. Migration
`20260728_integrity_and_auth.sql` giữ các guard an toàn cho database cũ; nó:

- thêm bảng `drivers`;
- bổ sung các trường rental, `violations` JSONB và địa điểm đón/trả;
- chuẩn hóa `service_orders.driver_id` rỗng thành `NULL`;
- backfill `expenses.vehicle_id` từ biển số trong `ref` khi tìm thấy xe;
- thêm foreign key ở trạng thái `NOT VALID` để không làm hỏng dữ liệu legacy;
- thêm trigger chống trùng lịch rental.

Sau khi kiểm tra các dòng legacy không vi phạm ràng buộc, có thể validate thủ công:

```sql
ALTER TABLE rentals VALIDATE CONSTRAINT rentals_valid_dates;
ALTER TABLE rentals VALIDATE CONSTRAINT rentals_car_plate_fk;
ALTER TABLE rentals VALIDATE CONSTRAINT rentals_customer_phone_fk;
ALTER TABLE drivers VALIDATE CONSTRAINT drivers_assigned_car_fk;
ALTER TABLE service_orders VALIDATE CONSTRAINT service_orders_car_plate_fk;
ALTER TABLE service_orders VALIDATE CONSTRAINT service_orders_driver_fk;
ALTER TABLE expenses VALIDATE CONSTRAINT expenses_vehicle_uuid_fk;
```

Chỉ chạy câu lệnh constraint thực sự tồn tại trên database. Với database mới, chạy
`database/schema.sql` trước rồi `npm run migrate`. Không sửa migration đã được ghi
trong ledger; tạo file migration mới cho thay đổi tiếp theo.

Migration là dạng additive và không xóa business rows. Không có rollback tự động
vì việc xóa cột/bảng có thể mất dữ liệu. Nếu cần rollback dữ liệu, dừng ứng dụng và
khôi phục bản backup đã kiểm tra. Việc quay lại bản ứng dụng cũ thường tương thích
với các cột mới, nhưng phải kiểm thử trước.

## 3. Authentication và password

- Login trả JWT HS256 trong cookie HttpOnly, `SameSite=Lax`; cookie có `Secure`
  khi `NODE_ENV=production`.
- Mutation đã đăng nhập yêu cầu Origin hợp lệ và CSRF token khớp cookie
  `agreen_csrf`; frontend gửi token bằng header `X-CSRF-Token`.
- Mọi API quản trị yêu cầu phiên server hợp lệ.
- Password mới được hash bằng bcrypt cost 12.
- User legacy có hash SHA-256 vẫn đăng nhập được một lần; sau khi xác thực đúng,
  server tự nâng cấp hash sang bcrypt.
- Đổi mật khẩu yêu cầu admin đã đăng nhập, mật khẩu hiện tại và mật khẩu mới mạnh.
  Phiên hiện tại bị xóa sau khi đổi.

Không tạo hoặc đổi password bằng SHA-256 trong SQL. Không ghi secret/password vào
repository. Nếu DB password hoặc JWT secret từng bị lộ, phải rotate thủ công tại
PostgreSQL/secret manager rồi cập nhật runtime environment; ứng dụng không tự rotate
credential của hệ thống bên ngoài.

## 4. Endpoint liên quan

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password` (admin)
- `POST /api/public/vehicles/search` (public, chỉ trả thông tin xe tối thiểu)
- `POST /api/upload`, `GET /api/uploads`, `DELETE /api/uploads/:filename`
- `PUT /api/expenses/:id`
- `PUT /api/service-orders/:id`
- `POST /api/rentals/:id/complete`

Rental create/update/delete/complete và service-order mutation chạy trong
transaction. Rental trùng lịch trả `409` với code `RENTAL_OVERLAP`.

## 5. Kiểm tra trước khi phát hành

Không trỏ test vào production database. Chạy theo thứ tự:

```bash
npm run test:migration
npm run typecheck
npm run lint
npm run build
npm test
```

Test PostgreSQL thật chỉ chạy khi có `TEST_DATABASE_URL`, hoặc khi `DATABASE_URL`
có tên database thể hiện rõ là database test. Nếu không có, test được đánh dấu
`SKIP` với lý do cụ thể; kết quả static không được xem là xác nhận migration đã
chạy thành công trên PostgreSQL.

Sau đó chạy smoke test trên staging: login/logout, đổi password, upload ảnh/PDF,
tạo hai lịch thuê trùng nhau, complete/delete rental, cập nhật expense và
service order rồi refresh trang.

Một số tùy chọn giao diện và security log hiển thị trong trình duyệt vẫn là dữ
liệu localStorage theo máy. Chúng không được xem là cấu hình đã đồng bộ database.
