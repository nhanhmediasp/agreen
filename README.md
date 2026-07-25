# 🚗 Hệ Thống Quản Trị Cho Thuê Xe Tự Lái (Car Rental Dashboard)

Hệ thống quản lý và tra cứu thông tin cho thuê xe tự lái toàn diện dành cho các đơn vị kinh doanh vận tải/cho thuê xe. Ứng dụng được xây dựng trên nền tảng web hiện đại, giao diện trực quan và tối ưu hóa trải nghiệm người dùng.

---

## ⚡ Hướng Dẫn Khởi Chạy Nhanh

Dự án này là một ứng dụng client-side React + Vite. Để chạy dự án trên máy của bạn, vui lòng thực hiện các bước sau:

> [!IMPORTANT]
> Dự án nằm trong thư mục `car-rental-dashboard`. Bạn cần di chuyển vào thư mục này trước khi chạy lệnh cài đặt hoặc chạy dev.

1. **Di chuyển vào thư mục dự án:**
   ```bash
   cd car-rental-dashboard
   ```

2. **Cài đặt các gói thư viện phụ thuộc:**
   ```bash
   npm install
   ```

3. **Khởi chạy ứng dụng ở chế độ phát triển (Development):**
   ```bash
   npm run dev
   ```
   *Sau khi chạy, truy cập đường dẫn mặc định hiển thị trên terminal (thường là `http://localhost:5173`).*

4. **Biên dịch dự án cho sản xuất (Production Build):**
   ```bash
   npm run build
   ```

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Core Framework:** [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite 8](https://vite.dev/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Styling:** Custom CSS thuần với biến CSS (CSS Variables) linh hoạt, hỗ trợ chuyển đổi chủ đề (Themes).
- **Fonts:** Be Vietnam Pro, Outfit & Space Mono từ Google Fonts.
- **Lưu trữ dữ liệu:** Đồng bộ hóa dữ liệu trực tiếp với trình duyệt qua **LocalStorage** (Không cần backend database, lưu giữ trạng thái khi làm mới trang).

---

## ✨ Các Tính Năng Nổi Bật

### 1. Bảng Điều Khiển (Dashboard)
- **Thống kê trạng thái:** Cập nhật số lượng xe Trống (Ready), Đang thuê (Rented), Bảo trì (Maintenance), và Tạm ngưng (Suspended).
- **Cảnh báo giấy tờ xe:** Tự động phát hiện và cảnh báo các xe có hạn Đăng kiểm, Bảo hiểm TNDS, hoặc Phù hiệu xe sắp hết hạn (trong vòng 7 ngày).
- **Lịch trình trực quan (Timeline Scheduler):** Hiển thị tình trạng hoạt động và người đang thuê của từng đầu xe theo lịch tuần từ Thứ 2 đến Chủ Nhật.

### 2. Quản Lý Xe (Fleet Management)
- Thêm mới, chỉnh sửa thông tin xe chi tiết: Biển số xe, tên xe, hãng xe, số ghế, số KM hiện tại, màu sắc, hình ảnh và thông tin liên hệ chủ xe.
- Cập nhật thời hạn đăng kiểm, bảo hiểm, phù hiệu.
- Đặt cấu hình giá thuê linh hoạt theo giờ, theo ngày, và theo tuần.

### 3. Tạo Đơn Thuê & Hợp Đồng (Create Rental)
- Biểu mẫu đặt xe đa bước (Multi-step Wizard) chuyên nghiệp.
- **Tính toán chi phí tự động:** Tự động tính tiền thuê dựa trên hình thức thuê (Giờ/Ngày/Tuần) và số lượng thời gian tương ứng.
- **Phụ phí cuối tuần:** Tự động phát hiện nếu thời gian thuê rơi vào ngày cuối tuần và áp dụng phụ phí (có thể tùy chỉnh tỷ lệ %).
- Kiểm soát số KM và mức nhiên liệu lúc nhận xe (tính theo tỷ lệ phần tám, ví dụ: 8/8, 4/8).
- Hỗ trợ lưu trữ hợp đồng dưới dạng bản vẽ hệ thống tự động hoặc tải lên ảnh chụp/file hợp đồng giấy đã ký.

### 4. Quản Lý Đơn Thuê/Hợp Đồng (Contract Management)
- Theo dõi danh sách đơn thuê Đang hoạt động (Active) và Đã hoàn thành (Completed).
- Thanh toán và kết thúc đơn thuê: Ghi nhận số KM/nhiên liệu thực tế khi bàn giao lại xe, tính toán chi phí phụ trội nếu có.
- Quản lý biên bản phạt nguội (Violations) gắn trực tiếp với từng hợp đồng thuê xe.

### 5. Quản Lý Khách Hàng (Customer Registry)
- Lưu trữ thông tin cá nhân khách hàng bao gồm Số điện thoại, CCCD, Bằng lái xe, địa chỉ.
- Phân loại khách hàng: **Thường (Normal)**, **VIP**, và **Cảnh báo (Warning)** đối với các khách hàng có lịch sử thuê xe xấu.
- Xem chi tiết lịch sử thuê xe và doanh thu đóng góp từ từng khách hàng.

### 6. Quản Lý Chủ Xe/Đối Tác Ký Gửi (Vehicle Owners)
- Quản lý danh sách các đối tác/chủ xe ký gửi phương tiện.
- Dễ dàng theo dõi những xe thuộc quyền sở hữu của chủ xe nào để thực hiện đối soát doanh thu.

### 7. Quản Lý Chi Phí (Expense Tracker)
- Ghi nhận mọi chi phí vận hành: Bảo dưỡng định kỳ, mua bảo hiểm, phí cầu đường, rửa xe, sửa chữa đột xuất...
- Phân loại chi phí và liên kết với mã số tham chiếu chứng từ.

### 8. Báo Cáo & Phân Tích (Reports & Analytics)
- Thống kê tổng doanh thu, tổng chi phí, lợi nhuận ròng dưới dạng biểu đồ/bảng số liệu.
- Phân tích hiệu suất sử dụng xe (tỷ lệ xe được thuê).
- Bảng xếp hạng các xe mang lại doanh thu cao nhất và các khách hàng trung thành nhất.

### 9. Cổng Tra Cứu Đối Tác Công Khai (Public Status)
- Một trang riêng biệt độc lập (`/status` hoặc qua menu đăng nhập) dành riêng cho các chủ xe ký gửi.
- Chủ xe có thể tự tra cứu tình trạng xe của mình bằng cách nhập **Biển số xe** và **Số điện thoại** mà không cần tài khoản admin.
- Hiển thị đầy đủ thông tin: Trạng thái hiện tại của xe, thời gian thuê còn lại, lịch sử doanh thu và hạn kiểm định của xe đó.

### 10. Cài Đặt & Quản Trị Hệ Thống (Settings)
- Tùy chỉnh thương hiệu: Thay đổi tên thương hiệu, Logo (hỗ trợ lưu lịch sử logo để rollback) và Favicon.
- Tùy chỉnh giao diện: Thay đổi màu sắc chủ đạo của toàn bộ hệ thống bằng bộ chọn màu (color picker).
- Thay đổi thông tin tài khoản quản trị (Username, Password, Avatar).
- **Sao lưu & Khôi phục (Backup & Restore):** Hỗ trợ xuất toàn bộ dữ liệu đang lưu trong hệ thống ra file JSON và nhập lại dữ liệu từ file backup vô cùng tiện lợi.

---

## 🔒 Tài Khoản Đăng Nhập Mặc Định

Hệ thống có cơ chế bảo mật đăng nhập cho Admin. Bạn có thể sử dụng tài khoản mẫu dưới đây để trải nghiệm:

- **Username:** `admin`
- **Password:** `admin123`

*(Bạn có thể thay đổi thông tin đăng nhập này trong phần **Cài đặt** của ứng dụng).*

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
car-rental-dashboard/
├── public/                 # Các tài nguyên tĩnh (favicon, logo, v.v.)
├── src/
│   ├── assets/             # Hình ảnh, font và tài nguyên nội bộ
│   ├── components/         # Các component dùng chung (ví dụ: ImageGallery)
│   ├── context/            # Quản lý trạng thái toàn cục (AppContext.tsx)
│   ├── pages/              # Các trang giao diện chính
│   │   ├── Dashboard.tsx        # Bảng điều khiển chính
│   │   ├── FleetManagement.tsx  # Quản lý danh sách xe
│   │   ├── CreateRental.tsx     # Biểu mẫu tạo đơn thuê mới
│   │   ├── Contracts.tsx        # Quản lý hợp đồng & Phạt nguội
│   │   ├── Customers.tsx        # Danh sách & Lịch sử khách hàng
│   │   ├── Owners.tsx           # Quản lý chủ xe/đối tác ký gửi
│   │   ├── Expenses.tsx         # Quản lý chi phí vận hành
│   │   ├── Reports.tsx          # Báo cáo doanh thu & Hiệu suất
│   │   ├── Settings.tsx         # Cài đặt thương hiệu, tài khoản, backup
│   │   ├── Login.tsx            # Trang đăng nhập bảo mật
│   │   └── PublicStatus.tsx     # Cổng tra cứu thông tin dành cho đối tác
│   ├── App.tsx             # Cấu hình Routing và Sidebar layout
│   ├── main.tsx            # Điểm khởi chạy ứng dụng React
│   ├── index.css           # CSS Reset & Design tokens (màu sắc, spacing)
│   └── nav.css             # CSS dành riêng cho thanh điều hướng
├── package.json            # Cấu hình thư viện và scripts
└── vite.config.ts          # Cấu hình Vite
```

---

## 📝 Bản quyền

Dự án được xây dựng phục vụ cho mục đích quản lý cho thuê xe tự lái và quản trị đối tác. Mọi quyền được bảo lưu.
#   a g r e e n  
 