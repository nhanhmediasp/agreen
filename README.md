# 🚗 Hệ Thống Quản Trị Cho Thuê Xe Tự Lái

Ứng dụng quản lý cho thuê xe tự lái: đội xe, hợp đồng, khách hàng, chủ xe ký gửi,
tài xế, chi phí và báo cáo doanh thu.

**Kiến trúc:** React + Vite (frontend) · Node.js + Express (API) · PostgreSQL (dữ liệu).
Dữ liệu nằm trong PostgreSQL nên nhiều nhân viên dùng chung một nguồn số liệu.

---

## 📁 Cấu trúc dự án

```text
.
├── database/
│   └── schema.sql              # Toàn bộ bảng, index, view, sequence (chạy lại được nhiều lần)
├── server/                     # API Node.js + Express
│   ├── index.js                # Điểm khởi chạy, gắn middleware & routes
│   ├── config.js               # Đọc .env, bắt buộc JWT_SECRET ở production
│   ├── db.js                   # Connection pool + helper transaction
│   ├── lib/
│   │   ├── crud.js             # Sinh router CRUD chuẩn cho bảng đơn giản
│   │   ├── mappers.js          # Chuyển đổi snake_case (DB) ⇄ camelCase (frontend)
│   │   ├── http.js             # HttpError + dịch lỗi PostgreSQL sang tiếng Việt
│   │   ├── ids.js              # Sinh id/mã đơn qua SEQUENCE (không trùng)
│   │   └── demoData.js         # Bộ sinh dữ liệu khởi tạo & dữ liệu mẫu lớn
│   ├── middleware/auth.js      # JWT trong cookie httpOnly
│   ├── routes/                 # auth, cars, owners, customers, rentals,
│   │                           # drivers, serviceOrders, expenses, images,
│   │                           # settings, admin (backup/restore), public
│   ├── scripts/
│   │   ├── migrate.js          # Áp dụng schema.sql
│   │   └── seed.js             # Tạo tài khoản admin + dữ liệu ban đầu
│   └── uploads/                # Ảnh xe & PDF hợp đồng (KHÔNG commit — nhớ backup)
├── src/                        # Frontend React
│   ├── api/client.ts           # Lớp gọi API duy nhất
│   ├── context/AppContext.tsx  # State toàn cục, đọc/ghi qua API
│   ├── components/
│   └── pages/                  # Dashboard, FleetManagement, CreateRental,
│                               # Contracts, ServiceOrders, Customers, Owners,
│                               # Expenses, Reports, Settings, Login, PublicStatus
├── nginx.conf                  # Cấu hình nginx cho aaPanel (HTTPS + proxy API)
├── nginx-security-headers.conf # Header bảo mật dùng chung cho mọi location
├── ecosystem.config.cjs        # Cấu hình PM2 cho API
└── .env.example                # Mẫu biến môi trường
```

---

## ⚡ Chạy trên máy local

Cần **Node.js ≥ 20** và **PostgreSQL ≥ 13**.

```bash
# 1. Cài thư viện
npm install

# 2. Tạo file cấu hình
cp .env.example .env
# Mở .env, điền DB_USER / DB_PASSWORD / DB_NAME và sinh JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Tạo bảng trong PostgreSQL
npm run db:migrate

# 4. Tạo tài khoản admin + dữ liệu khởi tạo
npm run db:seed
#    -> Mật khẩu admin được sinh ngẫu nhiên và IN RA TERMINAL MỘT LẦN. Lưu lại ngay.
#    (Muốn nạp thêm 50 xe / 500 hợp đồng để test: npm run db:seed:demo)

# 5. Chạy API (terminal 1)
npm run server:dev

# 6. Chạy frontend (terminal 2)
npm run dev
```

Mở `http://localhost:5173`. Vite đã cấu hình proxy `/api` → `127.0.0.1:5000`
nên frontend và API cùng origin — điều kiện bắt buộc để cookie phiên hoạt động.

---

## 🚀 Deploy lên aaPanel + PostgreSQL

### 1. Chuẩn bị trên aaPanel
- **App Store** → cài **Nginx**, **PostgreSQL** và **Node.js** (≥ 20).
- **Databases → PostgreSQL** → tạo database + user, ghi lại mật khẩu.

### 2. Đưa code lên server
```bash
cd /www/wwwroot
git clone <repo-url> car-rental-dashboard
cd car-rental-dashboard
npm install
```

### 3. Cấu hình
```bash
cp .env.example .env
nano .env      # điền DB_*, sinh JWT_SECRET, đặt NODE_ENV=production
```
> ⚠ Server sẽ **từ chối khởi động** ở chế độ production nếu `JWT_SECRET` còn trống
> hoặc vẫn là giá trị mẫu — đây là chủ ý, để không ai ký được token admin giả.

### 4. Khởi tạo database
```bash
npm run db:migrate
npm run db:seed        # in ra mật khẩu admin — LƯU LẠI NGAY
```

### 5. Build frontend
```bash
npm run build          # tạo thư mục dist/
```

### 6. Chạy API bằng PM2
```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup      # tự chạy lại sau khi reboot
pm2 logs car-rental-api      # kiểm tra log
```

### 7. Cấu hình nginx
Copy nội dung [nginx.conf](nginx.conf) vào phần **Config** của website trong aaPanel.
Cần sửa 3 chỗ:
- `server_name` → domain của bạn
- `root` → `/www/wwwroot/car-rental-dashboard/dist`
- đường dẫn `include .../nginx-security-headers.conf` → theo thư mục thật

Bật **SSL (Let's Encrypt)** trong aaPanel, rồi `nginx -t && nginx -s reload`.

### 8. Kiểm tra
```bash
curl https://yourdomain.com/api/health
# {"ok":true,"database":"car_rental","time":"..."}
```

### Cập nhật phiên bản mới
```bash
cd /www/wwwroot/car-rental-dashboard
git pull
npm install
npm run db:migrate          # an toàn khi chạy lại nhiều lần
npm run build
pm2 restart car-rental-api
```

---

## 📜 Danh sách script

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Frontend chế độ phát triển (Vite, port 5173) |
| `npm run build` | Kiểm tra kiểu + build production vào `dist/` |
| `npm run lint` | Chạy oxlint |
| `npm run server` | Chạy API (production) |
| `npm run server:dev` | Chạy API có tự reload khi sửa code |
| `npm run db:migrate` | Áp dụng `database/schema.sql` |
| `npm run db:seed` | Tạo admin + dữ liệu khởi tạo |
| `npm run db:seed:demo` | Nạp bộ dữ liệu lớn (50 xe / 500 hợp đồng) để test tải |

---

## 🔒 Bảo mật

Đã có:
- Mật khẩu hash **bcrypt** (cost 12) trong PostgreSQL — không lưu plaintext ở đâu.
- Phiên đăng nhập là **JWT trong cookie httpOnly + SameSite=Strict**, có hạn 8 giờ.
  JavaScript không đọc được cookie này, nên XSS không đánh cắp được phiên.
- **Chống brute-force phía server** theo IP (khoá 5 phút sau 5 lần sai) — lưu trong
  DB nên xoá localStorage không bỏ qua được. Kèm rate limit ở tầng HTTP.
- Đổi mật khẩu / tên đăng nhập phải **xác nhận bằng mật khẩu hiện tại**.
- Mọi endpoint `/api/*` (trừ `/api/auth/*` và `/api/public/*`) đều yêu cầu đăng nhập.
- **Cổng tra cứu công khai** (`/thong-tin-xe`) bắt buộc nhập đúng **cả biển số và
  số điện thoại**, so khớp chính xác, có rate limit, và chỉ trả về đúng thông tin
  chiếc xe đó — không lộ giá thuê, tên khách hay doanh thu.
- Tệp upload được đặt tên lại bằng chuỗi ngẫu nhiên (chống path traversal), giới hạn
  định dạng và kích thước, và được phục vụ với CSP `sandbox` để không thể thực thi.
- Ghi **nhật ký bảo mật** (đăng nhập thành công/thất bại, khoá, đổi mật khẩu) vào DB,
  xem được trong **Cài đặt → Bảo mật**.

Chưa có (nếu cần thì làm ở bước sau):
- Phân quyền nhiều vai trò (hiện mọi tài khoản đăng nhập được đều là quản trị).
- Xác thực 2 lớp (2FA).
- Backup database tự động — hiện phải tự đặt lịch trong aaPanel hoặc dùng chức năng
  **Cài đặt → Sao lưu & Khôi phục** để tải file JSON định kỳ.

> **Lưu ý về `npm audit`:** có một advisory `react-router` liên quan **RSC mode**.
> Dự án dùng `BrowserRouter` SPA thuần nên không chạm tới đường code đó, và
> 7.18.1 hiện đã là bản mới nhất (chưa có patch). Nên theo dõi và nâng khi có bản vá.

---

## ✨ Tính năng theo trang

### Tổng quan Vận hành (`/`)
KPI đội xe & **doanh thu hôm nay tính thật** từ hợp đồng bàn giao + chuyến dịch vụ
trong ngày (kèm % so với hôm qua khi có dữ liệu để so). Bảng trạng thái xe, cảnh báo
**xe quá hạn trả tính từ giờ trả thực tế**, và lịch nhận/trả xe hôm nay & ngày mai
lấy trực tiếp từ bảng hợp đồng.

### Quản lý Đội xe (`/fleet`)
Thêm/sửa/xoá xe (chặn trùng biển số, chặn xoá xe đang thuê hoặc còn lịch sử hợp đồng),
lọc theo giá/chủ xe/màu/trạng thái, xem Grid hoặc List. Trang chi tiết xe có đồng hồ
đếm ngược hợp đồng, biểu giá giờ/ngày/tuần, **hạn giấy tờ sửa được trực tiếp**,
**lịch đặt xe của tuần hiện tại**, lịch sử thuê và lịch sử chi phí.

### Tạo đơn thuê (`/rental/new`)
Wizard 3 bước: chọn xe & bảng giá (giờ/ngày/tuần, phụ phí cuối tuần) → thông tin
khách hàng (chọn có sẵn hoặc tạo mới) → thanh toán & hợp đồng. Hoá đơn tạm tính cập
nhật trực tiếp. Mã đơn do **SEQUENCE của PostgreSQL** sinh nên không bao giờ trùng.
Server chặn đặt trùng khoảng thời gian trên cùng một xe.

### Quản lý Đơn thuê (`/contracts`)
Danh sách có tìm kiếm, lọc trạng thái/thời gian, phân trang. Chi tiết hợp đồng, biên
bản phạt nguội, ảnh tình trạng xe (**upload lên server**, không nhồi base64 vào
trình duyệt). Tổng tiền do server tính theo **một công thức duy nhất**:
`tiền thuê + phí giao xe + phụ phí + tổng vi phạm`.

### Đơn dịch vụ & Tài xế (`/services`)
Chuyến chạy theo km với chiết khấu tài xế **giữ đúng cả khi đặt 0%**. Server tính lại
quãng đường, cước và chiết khấu từ dữ liệu thô nên client không thể gửi số sai lệch.

### Khách hàng (`/customers`)
Hồ sơ khách, phân loại Thường/VIP/Cảnh báo. Số lượt thuê **tính động từ bảng hợp đồng**
(qua view `customers_with_stats`) nên không còn cảnh lệch số.

### Chủ xe / Đối tác (`/owners`)
Danh sách đối tác ký gửi, xe của từng người, đối soát doanh thu theo **tỷ lệ chiết khấu
riêng của từng chủ xe**, tạo phiếu chi trả. Không cho xoá chủ xe khi còn xe gán cho họ.

### Sổ Thu chi (`/expenses`)
Chi phí vận hành, chi phí phát sinh theo hợp đồng, và thống kê chi trả chủ xe.

### Báo cáo (`/reports`)
Doanh thu / chi phí / lợi nhuận theo **7 ngày · 30 ngày · quý đang diễn ra · tuỳ chỉnh**,
tất cả neo vào ngày hiện tại. Hiệu suất khai thác từng xe và Top 5 khách hàng trong kỳ.
Đơn đã huỷ không tính vào doanh thu.

### Cài đặt (`/settings`)
Logo (chọn từ thư viện, có lịch sử để hoàn tác), màu chủ đạo, favicon,
**mẫu hợp đồng lưu vào database**, **Sao lưu & Khôi phục JSON**, nạp dữ liệu mẫu,
và trung tâm bảo mật kèm nhật ký.

### Cổng tra cứu đối tác (`/thong-tin-xe` hoặc `/public`)
Trang **không cần đăng nhập** cho chủ xe tự tra tình trạng xe của mình bằng biển số +
số điện thoại đã đăng ký.

---

## 🔑 Đăng nhập lần đầu

Không có mật khẩu mặc định trong source code. Tài khoản được tạo khi chạy
`npm run db:seed`, mật khẩu in ra terminal **một lần duy nhất**.

Quên mật khẩu? SSH vào server và đặt lại:
```bash
node -e "
require('dotenv/config');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const pass = process.argv[1];
(async () => {
  const c = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  await c.connect();
  await c.query('UPDATE users SET password_hash = \$1 WHERE username = \$2',
    [await bcrypt.hash(pass, 12), 'admin']);
  await c.end();
  console.log('Đã đặt lại mật khẩu cho admin.');
})();
" 'MatKhauMoiCuaBan'
```

---

## 🛠️ Công nghệ

- **Frontend:** React 19, TypeScript, Vite 8, React Router 7, Lucide Icons, CSS thuần
- **Backend:** Node.js, Express 5, PostgreSQL (`pg`), bcryptjs, jsonwebtoken, multer,
  helmet, express-rate-limit
- **Fonts:** Inter & JetBrains Mono (Google Fonts)

---

## 📝 Bản quyền

Dự án phục vụ mục đích quản lý cho thuê xe tự lái và quản trị đối tác.
