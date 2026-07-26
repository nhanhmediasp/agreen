# 🚗 ĐẶC TẢ HỆ THỐNG AGREEN CAR RENTAL MANAGEMENT (SPEC.MD)

---

## 1. Danh sách trang (Pages)

### 1.1. Trang Tổng quan Vận hành (Dashboard)
- **Tên trang:** Tổng quan Vận hành
- **Đường dẫn route:** `/`
- **Mục đích:** Cung cấp bức tranh toàn cảnh về hoạt động kinh doanh cho thuê xe theo thời gian thực (số lượng xe trống, xe đang cho thuê, doanh thu trong ngày, lịch trình đưa/trả xe sắp tới).
- **Các thành phần UI chính:**
  - **KPI Cards (4 thẻ chỉ số):** Tổng đội xe, Đang cho thuê, Xe sẵn sàng, Doanh thu hôm nay (kèm tỷ lệ tăng/giảm % so với ngày/tháng trước).
  - **Fleet Board (Bảng trạng thái xe trực quan):** Hiển thị danh sách card xe phân loại theo trạng thái (Sẵn sàng / Đang thuê / Bảo trì / Tạm ngưng) kèm nút bấm lọc nhanh.
  - **Lịch trình sắp tới (Upcoming Schedule List):** Danh sách mốc thời gian nhận/trả xe trong ngày và ngày mai (tên khách, SĐT, biển số, dòng xe, thời gian).
  - **Bảng Đặt xe gần đây (Recent Bookings Table):** Top các đơn thuê mới tạo (mã HĐ, khách hàng, biển số, ngày thuê/trả, số tiền, trạng thái thanh toán).
  - **Modal Chi tiết Xe (Car Detail Modal):** Hiển thị ảnh xe, thông số (hãng, chỗ, KM, màu, SĐT chủ xe), banner cảnh báo trễ hạn/đang thuê/sẵn sàng và nút chuyển hướng tạo đơn hoặc sửa xe.
- **Context Actions / API gọi:**
  - Lấy danh sách `cars`, `rentals` từ `AppContext`.
  - Gọi `showToast()`.
  - Chuyển hướng route: `/fleet`, `/contracts`, `/rental/new`, `/fleet?id={carId}`, `/contracts?id={rentalId}`.

---

### 1.2. Quản lý Đội xe (Fleet Management)
- **Tên trang:** Quản lý Đội xe
- **Đường dẫn route:** `/fleet`
- **Mục đích:** Quản lý toàn bộ danh sách phương tiện trong hệ thống (thêm, sửa, xóa, lọc theo nhiều tiêu chí, theo dõi giá thuê, hạn giấy tờ xe, lịch đặt xe theo tuần, lịch sử thuê và lịch sử chi phí sửa chữa từng xe).
- **Các thành phần UI chính:**
  - **Thanh tìm kiếm & Nút Lọc Nâng Cao Popup:** Tìm kiếm biển số/dòng xe; lọc theo dải giá thuê, chủ xe sở hữu, palette màu sắc (8 màu), trạng thái xe.
  - **Thanh Filter Trạng Thái (Status Tags):** Lọc Tất cả / Sẵn sàng trống / Đang cho thuê / Đang bảo trì / Tạm ngưng (kèm số lượng badge).
  - **Chế độ xem Grid / List:** Chuyển đổi linh hoạt giữa hiển thị thẻ xe có ảnh và bảng danh sách.
  - **Trang Chi tiết Xe (Sub-page View khi chọn 1 xe):**
    - Ảnh đại diện xe lớn + Biển số + Badge trạng thái.
    - Bảng thông số chi tiết (Hãng, Năm sản xuất, Màu, Số chỗ, Số KM hiện tại, Tên chủ xe).
    - Thẻ hợp đồng đang chạy + Đồng hồ đếm ngược thời gian còn lại (Live Countdown Timer).
    - **Biểu giá thuê tự đặt:** Thuê theo Giờ (đ/h), Thuê theo Ngày (đ/ngày), Thuê theo Tuần (đ/tuần).
    - **Hạn giấy tờ xe:** Hạn đăng kiểm, Hạn bảo hiểm TNDS, Hạn phù hiệu xe (kèm badge cảnh báo Còn hạn / Sắp hết hạn / Đã hết hạn).
    - **Bảng Lịch đặt xe tuần này (Week Calendar Timeline):** 7 ngày từ Thứ 2 đến Chủ Nhật hiển thị Bận/Trống/Bảo trì/Ngưng.
    - **Bảng Lịch sử người đặt xe (Rental History Table):** Phân trang 10 lượt/trang (Khách hàng, SĐT, Thời gian thuê, Tổng tiền, Trạng thái).
    - **Bảng Lịch sử chi phí xe (Car Expense History Table):** Phân loại Bảo dưỡng/Sửa chữa/Vệ sinh + Nút "Thêm chi phí" mở Modal nhập nhanh khoản chi.
  - **Modal Thêm xe mới (Add Car Form Modal):** Nhập biển số, dòng xe, hãng, năm, số chỗ, màu sắc (palette), số KM, chọn chủ xe có sẵn hoặc tạo nhanh chủ xe mới, chọn ảnh từ thư viện `ImageGallery`, đặt giá theo giờ/ngày/tuần.
  - **Modal Chỉnh sửa xe (Edit Car Form Modal):** Cập nhật thông số xe, hình ảnh, giá thuê và xóa xe (có kiểm tra điều kiện không xóa xe đang cho thuê).
  - **Modal Nhận trả xe (Return Car Modal):** Nhập số KM thực tế lúc trả, mức nhiên liệu (8/8, 6/8, 4/8, 2/8), phụ phí phát sinh và chọn trạng thái thanh toán.
- **Context Actions / API gọi:**
  - `addCar(car)`, `updateCar(id, updatedFields)`, `deleteCar(id)`, `completeRental(id, endKm, extraFee, endFuel, paymentStatus)`.
  - `addOwner(owner)`, `addExpense(expense)`, `showToast()`.

---

### 1.3. Tạo đơn thuê xe mới (Create Rental)
- **Tên trang:** Tạo đơn thuê mới
- **Đường dẫn route:** `/rental/new`
- **Mục đích:** Quy trình đa bước (Multi-step Wizard) để nhân viên thiết lập đơn thuê xe, kiểm tra tình trạng bàn giao xe, tính toán chi phí tự động và xuất hợp đồng.
- **Các thành phần UI chính:**
  - **Thanh Tiến Trình 3 Bước (Step Progress Bar):**
    - **Bước 1: Chọn xe & Bảng giá:** Ô tìm kiếm xe trống gợi ý 5 kết quả; Nút "Thêm xe mới ngay" mở Modal nhập nhanh xe; Chọn bảng giá (Ngày/Giờ/Tuần), nhập số lượng; Tick chọn Phụ phí Cuối tuần/Lễ tết (%) tùy chỉnh; Chọn Ngày nhận (Ngày trả tự động tính); Nhập số KM và Mức nhiên liệu bàn giao; Tải ảnh tình trạng xe thực tế qua `ImageGallery`.
    - **Bước 2: Thông tin Khách hàng:** Chuyển đổi tab "Chọn khách hàng có sẵn" (tìm kiếm gợi ý 5 kết quả) hoặc "Tạo mới khách hàng" (SĐT, Họ tên, CCCD, GPLX, Địa chỉ).
    - **Bước 3: Thanh toán & Hợp đồng:** Chọn loại hợp đồng ("Hệ thống tự tạo mẫu hợp đồng" hoặc "Tải lên tệp hợp đồng có sẵn PDF/Scan scan từ máy hoặc thư viện"); Nhập Tiền cọc giữ xe; Chọn Tình trạng thanh toán (Đã cọc / Đã thanh toán / Còn nợ).
  - **Cột Phụ Sticky Hóa Đơn Tạm Tính (Live Receipt Card):** Tự động tính toán tổng tiền thuê gốc, phí phụ thu cuối tuần, phí giao xe, tổng tiền thanh toán và tỷ lệ/số tiền hoa hồng chi trả cho chủ xe theo thời gian thực.
  - **Popup Phiếu Đặt Xe / Hóa Đơn (Receipt Modal):** Hiển thị chi tiết thông tin đơn hàng vừa khởi tạo kèm nút bấm chuyển sang Quản lý Đơn thuê.
- **Context Actions / API gọi:**
  - `addRental(rental)`, `addCar(car)`, `addCustomer(customer)`, `showToast()`.

---

### 1.4. Quản lý Đơn thuê / Hợp đồng (Contracts & Violations)
- **Tên trang:** Quản lý Đơn thuê (HĐ)
- **Đường dẫn route:** `/contracts`
- **Mục đích:** Theo dõi danh sách hợp đồng cho thuê xe, quản lý tình trạng thanh toán, chỉnh sửa hợp đồng, ghi nhận và xử lý các khoản chi phí phát sinh/vi phạm giao thông/phạt nguội, tải lên ảnh thực tế và xem bản in hợp đồng.
- **Các thành phần UI chính:**
  - **Thanh Tìm Kiếm & Bộ Lọc Thời Gian:** Lọc theo mã đơn, biển số, tên khách; chọn khoảng thời gian (Tất cả / 7 ngày / 30 ngày / Tùy chỉnh từ ngày - đến ngày); Tab trạng thái (Tất cả / Đang thuê / Hoàn tất).
  - **Bảng Danh Sách Đơn Thuê (Contracts Table):** Phân trang 10 đơn/trang. Hiển thị Mã HĐ, Biển số xe, Khách hàng, Thời gian thuê, Tổng tiền, Tiền cọc, Trạng thái thanh toán, Trạng thái đơn, Nút thao tác (Xem, Sửa).
  - **Trang Chi Tiết Đơn Thuê (Sub-page Detail View khi chọn 1 đơn):**
    - **Thẻ Thời gian & Lịch trình:** Ngày nhận, Ngày trả, Tổng thời gian (ví dụ: 2 ngày 5h) + Đồng hồ đếm ngược thời gian còn lại (Live Countdown Timer nếu xe đang thuê).
    - **Thẻ Thông tin Khách hàng:** Họ tên, SĐT, CCCD, GPLX, Địa chỉ thường trú.
    - **Thẻ Xe & Chủ xe ký gửi:** Ảnh xe, dòng xe, biển số, số KM ban đầu, Tên & SĐT chủ xe ký gửi.
    - **Bảng Chi phí phát sinh / Vi phạm giao thông (Violations Table):** Danh sách phạt nguội, hỏng hóc, sửa chữa (Ngày phát sinh, Nội dung, Số tiền, Link xem tệp bằng chứng, Trạng thái thu tiền) + Nút "Thêm chi phí phát sinh" mở Modal nhập.
    - **Timeline Tiến Trình Mốc Hoạt Động Đơn Hàng:** 3 mốc trực quan (1. Khởi tạo đơn -> 2. Bàn giao xe cho khách -> 3. Khách trả xe & Thanh lý hợp đồng) kèm mốc thời gian thực tế.
    - **Bộ Sưu Tập Ảnh Trạng Thái Xe Thực Tế (Handover & Return Photos Grid):** Hiển thị các hình ảnh chụp ngoại thất, nội thất, đồng hồ KM & vết xước thực tế lúc giao/nhận xe + Nút "Tải ảnh từ máy/ĐT" và "Chọn từ thư viện".
    - **Cột Hóa Đơn & Hợp Đồng (Editable Invoice & Contract Source):** Sửa giá thuê xe gốc, phí giao xe, phụ phí phát sinh; Xem tệp hợp đồng đính kèm hoặc tải tệp lên; Nút xem Mẫu hợp đồng hệ thống.
  - **Modal Chỉnh Sửa Hợp Đồng (Edit Contract Modal):** Sửa thông tin khách, ngày thuê/trả, tổng tiền, trạng thái thanh toán, tệp hợp đồng và tiền hoa hồng chủ xe.
  - **Modal Thêm/Sửa Vi Phạm Giao Thông (Violation Modal):** Nhập ngày, nội dung vi phạm, số tiền, link bằng chứng, trạng thái (Đã thu / Chưa thu).
  - **Modal Xem Trực Quan Hợp Đồng (System Contract Preview Modal):** Điền dữ liệu thực tế vào mẫu văn bản hợp đồng.
- **Context Actions / API gọi:**
  - `updateRental(id, updatedFields)`, `showToast()`.

---

### 1.5. Quản lý Đơn Dịch vụ & Tài xế (Service Orders & Drivers)
- **Tên trang:** Quản lý Đơn Dịch vụ & Tài xế
- **Đường dẫn route:** `/services`
- **Mục đích:** Quản lý các chuyến đi cước theo KM/chuyến có tài xế lái, tính toán hoa hồng tài xế, quản lý hồ sơ tài xế, tạo phiếu báo giá xuất ảnh PNG gửi Zalo cho khách.
- **Các thành phần UI chính:**
  - **Thẻ Thống Kê KPI (4 Cards):** Thu nhập tài xế nhận, Tổng cước thu khách, Số đơn hoàn thành (tổng KM), Công nợ chưa thu.
  - **Thanh Tab Chuyển Đổi:** Tab "Đơn dịch vụ cước chuyến" vs Tab "Danh sách Tài xế".
  - **Tab 1 - Bảng Đơn Dịch Vụ Cước Chuyến (Service Orders Table):** Hiển thị Mã đơn, Thời gian, Xe chạy, Điểm đón / Điểm trả, Quãng đường (KM) & Đơn giá, Tổng cước thu, Chiết khấu tài xế được nhận (%), Nút bấm chuyển đổi nhanh thanh toán (Đã thanh toán / Chưa thanh toán), Nút "Báo giá / Chi tiết".
  - **Modal Thêm/Sửa Đơn Dịch Vụ (Order Modal):**
    - Ô tìm kiếm chọn xe phục vụ (tự động lấy số KM hiện tại của xe làm `startKm`).
    - Ô chọn tài xế có sẵn (tự động điền % chiết khấu mặc định của tài xế) hoặc chọn "Thêm nhanh tài xế mới inline" (nhập tên, SĐT, số GPLX, hạng B2/C).
    - Nhập Điểm đón, Điểm trả, Ngày giờ dịch vụ, Số KM bắt đầu, Số KM kết thúc (Quãng đường tự động tính).
    - Đơn giá cước (mặc định 15,000đ/KM), Phụ phí vé trạm/cầu đường.
    - % Chiết khấu tài xế (mặc định 80%, số tiền tài xế thực nhận tự động tính).
  - **Modal Xem Đơn & Gửi Báo Giá Cho Khách (Quote Receipt Modal):**
    - Phiếu báo giá thiết kế chuẩn hóa hóa đơn cước chuyến.
    - Nút **"Sao chép văn bản báo giá Zalo"**: Tự động copy đoạn text đã định dạng vào Clipboard để dán Zalo/SMS.
    - Nút **"Chụp & Sao chép Ảnh Zalo (Ctrl+V)"**: Sử dụng `html2canvas` chụp hình phiếu báo giá dạng PNG và copy vào Clipboard để dán trực tiếp cửa sổ chat Zalo.
    - Nút **"Tải xuống Ảnh PNG"**: Tải file ảnh báo giá PNG về máy.
  - **Tab 2 - Bảng Quản Lý Tài Xế (Drivers Directory Table):** Hiển thị Avatar, Họ tên, SĐT, Số GPLX (Hạng B2, C...), Trạng thái (Sẵn sàng / Đang chuyến / Đang nghỉ), Số chuyến đã chạy, % Chiết khấu mặc định, Nút xem trang hồ sơ chi tiết.
  - **Modal Thêm/Sửa Tài Xế (Driver Modal):** Nhập tên, SĐT, GPLX, hạng bằng, địa chỉ, ghi chú, xe phụ trách, % chiết khấu và upload ảnh đại diện (Base64 file upload).
  - **Trang Chi Tiết Tài Xế Riêng Biệt (Dedicated Full-Page Driver Detail View):**
    - Header Hồ sơ tài xế: Avatar lớn, Họ tên, Trạng thái, SĐT, GPLX, Xe phụ trách.
    - 4 Thẻ chỉ số tài chính của riêng tài xế đó (Thu nhập tài xế nhận, Tổng cước thu, Số chuyến hoàn thành, Công nợ chưa thu).
    - Bộ lọc chọn Ngày chạy chuyến.
    - Bảng danh sách toàn bộ các hóa đơn chuyến đi hằng ngày của tài xế đó.
- **Context Actions / API gọi:**
  - `addServiceOrder(order)`, `updateServiceOrder(id, updatedFields)`, `deleteServiceOrder(id)`, `toggleServiceOrderPayment(id)`.
  - `addDriver(driver)`, `updateDriver(id, updatedFields)`, `deleteDriver(id)`, `showToast()`.

---

### 1.6. Quản lý Khách hàng (Customer Registry)
- **Tên trang:** Khách hàng
- **Đường dẫn route:** `/customers`
- **Mục đích:** Quản lý danh bạ khách hàng, xác minh bằng lái/CCCD, phân loại khách VIP/Cảnh báo, theo dõi lịch sử thuê xe và tổng số tiền khách đã chi tiêu.
- **Các thành phần UI chính:**
  - **Thanh Tìm Kiếm & Nút Thêm Khách:** Tìm theo tên hoặc SĐT; phân trang 10 khách/trang.
  - **Bảng Danh Sách Khách Hàng (Customer Table):** STT, Avatar & Họ tên, Số điện thoại, Phân loại (Khách thường / VIP ⭐ / Cần chú ý ⚠️), Trạng thái hồ sơ (Đã xác minh / GPLX hết hạn), Số đơn đang hoạt động.
  - **Trang Chi Tiết Khách Hàng (Sub-page Customer Detail View):**
    - 4 Thẻ chỉ số tài chính khách hàng: Tổng doanh số chi tiêu (₫), Tổng số lượt thuê, Số đơn đang thuê, Số đơn đã hoàn thành.
    - Hồ sơ cá nhân: Avatar, Họ tên, SĐT, Số CCCD, Giấy phép lái xe, Địa chỉ thường trú, Tag kiểm định GPLX.
    - Ô Ghi chú nội bộ (Chỉnh sửa trực tiếp tự động lưu).
    - Bảng Lịch sử giao dịch & đơn thuê của riêng khách hàng đó (tìm kiếm theo mã HĐ/biển số xe, lọc theo trạng thái Đang thuê / Đã trả).
  - **Modal Thêm/Sửa Khách Hàng (Add/Edit Customer Modal):** Nhập Họ tên, SĐT, CCCD, GPLX, Địa chỉ, Phân loại (Bình thường, VIP, Cần chú ý), Ghi chú riêng và chọn Avatar từ `ImageGallery`.
- **Context Actions / API gọi:**
  - `addCustomer(customer)`, `updateCustomer(id, updatedFields)`, `showToast()`.

---

### 1.7. Quản lý Chủ xe / Đối tác (Vehicle Owners)
- **Tên trang:** Chủ xe / Đối tác
- **Đường dẫn route:** `/owners`
- **Mục đích:** Quản lý danh sách các đối tác gửi xe kinh doanh, theo dõi danh sách xe sở hữu, đối soát tổng doanh thu phát sinh và tạo phiếu chi thanh toán chiết khấu cho chủ xe.
- **Các thành phần UI chính:**
  - **Thanh Tìm Kiếm & Nút Thêm Chủ Xe:** Tìm theo tên hoặc SĐT chủ xe; phân trang 10 đối tác/trang.
  - **Bảng Danh Sách Chủ Xe (Owner Directory Table):** Avatar, Họ tên, SĐT, Địa chỉ, Số xe sở hữu, Tổng tiền chi trả trực tiếp (₫), Ghi chú.
  - **Trang Chi Tiết Chủ Xe (Sub-page Owner Detail View):**
    - 4 Thẻ chỉ số tài chính đối tác: Doanh số xe phát sinh (₫), Tỷ lệ % chi trả gợi ý (mặc định 75%), Chi phí chiết khấu phải trả cho chủ xe (kèm nút **"Tạo phiếu chi"**), Doanh thu Garage giữ lại (Lợi nhuận ròng).
    - Hồ sơ đối tác: Avatar, Họ tên, SĐT, Địa chỉ, Ghi chú hợp tác.
    - Bảng Danh sách xe sở hữu (Biển số, Dòng xe, Màu sắc, Số KM, Trạng thái hiện tại).
    - Bảng Lịch sử lượt thuê của các xe thuộc chủ xe này (phân trang 10 lượt/trang).
  - **Modal Thêm/Sửa Chủ Xe (Add/Edit Owner Modal):** Nhập Họ tên, SĐT, Địa chỉ, Tỷ lệ % chi trả gợi ý (0-100%), Ghi chú riêng và chọn Avatar từ `ImageGallery`.
- **Context Actions / API gọi:**
  - `addOwner(owner)`, `updateOwner(id, updatedFields)`, `deleteOwner(id)`, `addExpense(expense)`, `showToast()`.

---

### 1.8. Sổ Thu Chi & Chi Phí (Expense Tracker)
- **Tên trang:** Sổ Thu chi & Chi phí
- **Đường dẫn route:** `/expenses`
- **Mục đích:** Quản lý mọi khoản chi phí vận hành, chi phí phát sinh vi phạm từ đơn thuê và sổ đối soát thanh toán chiết khấu chủ xe.
- **Các thành phần UI chính:**
  - **Thẻ Thống Kê KPI (3 Cards):** Tổng chi phí hệ thống, Bình quân chi phí mỗi xe, Số giao dịch lọc được.
  - **Thanh Tab Chuyển Đổi (3 Tabs):**
    - **Tab 1 - Sổ chi phí vận hành:** Thanh tìm kiếm & Lọc khoảng thời gian (Tất cả / 7 ngày / 30 ngày); Bảng danh sách khoản chi (Nội dung, Số tiền ₫, Danh mục Bảo dưỡng/Sửa chữa/Vệ sinh/Giấy tờ/Chi trả chủ xe, Liên kết biển số xe, Ngày chi); Nút **"Ghi nhận chi phí"** mở Modal nhập mới.
    - **Tab 2 - Chi phí phát sinh đơn thuê:** Thống kê Tổng phát sinh, Đã thu tiền khách, Chưa thu tiền khách; Bảng danh sách tất cả các khoản vi phạm/phạt nguội/hỏng hóc gắn với từng mã đơn thuê, biển số xe, tên khách hàng và trạng thái thu tiền.
    - **Tab 3 - Thống kê chi trả Chủ xe:** Bảng tổng hợp từng đối tác chủ xe, danh sách biển số xe gửi, tổng doanh số phát sinh, số tiền chiết khấu phải trả + Nút **"Tạo phiếu chi"** lập tức ghi nhận khoản chi chiết khấu.
  - **Modal Ghi Nhận Chi Phí Mới (Add Expense Modal):** Nhập Nội dung chi, Số tiền (₫), Danh mục, Ngày chi, Chọn xe liên kết.
- **Context Actions / API gọi:**
  - `addExpense(expense)`, `showToast()`.

---

### 1.9. Báo cáo & Thống kê (Reports & Analytics)
- **Tên trang:** Báo cáo & Thống kê
- **Đường dẫn route:** `/reports`
- **Mục đích:** Phân tích hiệu quả tài chính và đo lường tỷ lệ khai thác đội xe theo các khoảng thời gian linh hoạt.
- **Các thành phần UI chính:**
  - **Bộ Lọc Khoảng Thời Gian (Time Range Selector):** 7 ngày, 30 ngày, Quý này, Tùy chỉnh từ ngày - đến ngày.
  - **Thẻ Thống Kê Tổng Quan (4 KPI Cards):** Doanh thu (Tổng), Chi phí hoạt động, Lợi nhuận ròng, Tỷ lệ khai thác đội xe trung bình (%).
  - **Biểu Đồ Cột So Sánh Tài Chính (CSS Bar Chart):** Cột Doanh thu vs Chi phí vs Lợi nhuận với tỷ lệ % trực quan.
  - **Danh Sách Hiệu Suất Khai Thác Theo Xe (Fleet Utilization Progress List):** Danh sách tất cả xe xếp hạng theo % số ngày được thuê trong chu kỳ (thanh progress bar độ phủ 0-100%).
  - **Top 5 Khách Hàng Thuê Nhiều Nhất (Top Customers Award Card):** Xếp hạng khách hàng trung thành theo tổng số lượt thuê xe.
  - **Bảng Cơ Cấu Chi Phí Bảo Dưỡng Theo Xe (Expense Breakdown Table):** Chi tiết chi phí Bảo dưỡng, Vệ sinh, Sửa chữa/Khác của từng đầu xe.
- **Context Actions / API gọi:**
  - Truy vấn dữ liệu `cars`, `expenses`, `rentals`, `customers` từ `AppContext`.

---

### 1.10. Cài đặt Hệ thống (Settings)
- **Tên trang:** Cài đặt Hệ thống
- **Đường dẫn route:** `/settings`
- **Mục đích:** Tùy biến giao diện thương hiệu, biên soạn mẫu hợp đồng in PDF, thử nghiệm dữ liệu tải trọng lớn và quản lý trung tâm bảo mật website.
- **Các thành phần UI chính:**
  - **Thanh Tab Chuyển Đổi (3 Tabs):**
    - **Tab 1 - Giao diện hệ thống:**
      - Logo thương hiệu: Upload logo mới hoặc bấm "Hoàn tác logo cũ" (rollback lịch sử logo).
      - Palette màu chủ đạo (Theme Primary): 5 màu curated (Xanh Lá Vận Tải `#006837`, Xanh Dương Đậm `#1E3A8A`, Đen Thạch Anh `#1A231E`, Đỏ Huyết Dụ `#831843`, Hổ Phách `#B45309`). Tự động thay đổi biến CSS `--primary` và `--primary-hover` toàn ứng dụng.
      - **Dữ liệu mẫu 500 bản ghi (Stress-Test Performance):** Nút "Nạp 500 bản ghi ngẫu nhiên" (`load500DemoData()`) và Nút "Đặt lại dữ liệu ban đầu" (`resetDemoData()`).
    - **Tab 2 - Mẫu hợp đồng:**
      - Trình soạn thảo văn bản hợp đồng với nút chèn nhanh tag biến: `{ten_khach_hang}`, `{so_dien_thoai}`, `{bien_so_xe}`, `{dong_xe}`, `{ngay_thue}`, `{ngay_tra}`, `{tong_tien_thue}`, `{tien_dat_coc}`.
      - Nút "Xem trước Bản in hợp đồng (PDF giả lập)" mở Modal hiển thị khổ giấy A4 chuẩn hóa có logo, thông tin thương hiệu và chữ ký 2 bên.
    - **Tab 3 - Bảo mật & Anti-Spam:**
      - Thẻ trạng thái các lớp bảo vệ đang hoạt động: Chống Brute-Force lockout 60s, Mã CAPTCHA toán học chống Bot, Chống cào dữ liệu.
      - Bảng Lịch sử nhật ký bảo mật & Cảnh báo hệ thống (Security Audit Log Table) hiển thị thời gian, loại sự cố (LOGIN_SUCCESS, LOGIN_FAILED, LOCKOUT, PASSWORD_CHANGE), tài khoản và nội dung chi tiết + Nút "Xóa nhật ký".
- **Context Actions / API gọi:**
  - `updateSettings(newSettings)`, `rollbackLogo()`, `load500DemoData()`, `resetDemoData()`, `getSecurityLogs()`, `clearSecurityLogs()`, `showToast()`.

---

### 1.11. Cổng Tra Cứu Đối Tác Công Khai (Public Status)
- **Tên trang:** Cổng tra cứu Đối tác
- **Đường dẫn route:** `/thong-tin-xe` hoặc `/public`
- **Mục đích:** Trang tra cứu độc lập dành riêng cho các chủ xe/đối tác ký gửi tự kiểm tra tình trạng hoạt động và thời gian trả xe mà không cần đăng nhập tài khoản Admin.
- **Các thành phần UI chính:**
  - Form tra cứu: Ô nhập Biển số xe (VD: `51F-123.45`) HOẶC Số điện thoại đối tác.
  - Xử lý chuỗi tìm kiếm thông minh: Tự động loại bỏ dấu chấm, dấu gạch ngang, khoảng trắng và không phân biệt chữ hoa/thường.
  - Thanh chọn xe (nếu 1 SĐT sở hữu nhiều xe): Thẻ tab chọn nhanh giữa các đầu xe.
  - **Thẻ Kế Thừa Trạng Thái Xe (Car Result Card):**
    - Ảnh đại diện xe lớn + Biển số khung mạ kim loại + Tên dòng xe.
    - Badge trạng thái xe rõ ràng (Xe đang trống sẵn sàng / Xe đang được thuê / Xe đang bảo trì / Xe đang tạm ngưng).
    - Đồng hồ hiển thị Thời gian dự kiến trả xe còn lại (nếu đang thuê).
    - Số KM hiện tại của xe.
    - Hạn đăng kiểm của xe.
- **Context Actions / API gọi:**
  - Truy vấn mảng `cars` từ `AppContext`.

---

### 1.12. Trang Đăng nhập Bảo mật (Login)
- **Tên trang:** Đăng nhập Quản trị
- **Đường dẫn route:** Màn hình khóa khi chưa đăng nhập
- **Mục đích:** Xử lý xác thực người dùng quản trị với cơ chế bảo mật nhiều lớp chống tấn công dò mật khẩu tự động.
- **Các thành phần UI chính:**
  - Form đăng nhập Username & Password (có nút ẩn/hẹn mật khẩu).
  - **Widget Mã CAPTCHA Toán Học:** Tự động kích hoạt khi đăng nhập sai từ 3 lần trở lên (bắt buộc giải phép tính ngẫu nhiên `N1 + N2 = ?`).
  - **Banner Khóa Đăng Nhập (Brute-Force Lockout Banner):** Tự động đếm ngược 60 giây và vô hiệu hóa nút đăng nhập nếu nhập sai mật khẩu 5 lần liên tiếp.
  - Khung thông tin tài khoản mẫu mặc định (`admin` / `agreen2024`).
  - **Modal Chỉnh sửa Tài khoản Admin (trên Topbar):** Cho phép đổi Username, Mật khẩu mới và Upload ảnh đại diện Avatar admin.
- **Context Actions / API gọi:**
  - `checkLogin()`, `doLogout()`, `getAdminCredentials()`, `updateAdminCredentials(username, password)`, `logSecurityEvent(type, message, username)`.

---

## 2. Danh sách Flow người dùng quan trọng

### 2.1. Flow 1: Tạo đơn thuê xe tự lái (Multi-step Rental Creation Flow)
1. **Bước 1 (Vào trang & Chọn xe):** Người dùng bấm "Tạo đơn" trên thanh Topbar hoặc Dashboard -> Chuyển đến `/rental/new`.
2. **Bước 2 (Thiết lập bảng giá & thời gian):**
   - Tìm kiếm và chọn một xe có trạng thái `ready` (hoặc mở Modal "Thêm xe mới ngay" để đăng ký nhanh xe mới).
   - Chọn loại giá thuê (Theo ngày / Theo giờ / Theo tuần) -> Nhập số lượng thời gian.
   - (Tùy chọn) Tick chọn "Áp dụng phụ phí cuối tuần/lễ" -> Nhập tỷ lệ % phụ phí (mặc định 20%).
   - Chọn Ngày giờ nhận xe -> Ngày giờ trả xe dự kiến tự động nhảy theo số lượng thời gian.
   - Nhập Số KM lúc bàn giao (tự động điền số KM hiện tại của xe) và Mức nhiên liệu (8/8, 6/8, 4/8, 2/8).
   - (Tùy chọn) Tải lên ảnh chụp thực tế tình trạng ngoại thất/nội thất xe lúc giao.
   - Bấm "Tiếp tục".
3. **Bước 3 (Thông tin khách thuê):**
   - Chế độ 1: Chọn khách hàng có sẵn -> Gõ tên/SĐT -> Chọn từ danh sách gợi ý 5 kết quả -> Các ô CCCD, GPLX, Địa chỉ tự động điền.
   - Chế độ 2: Tạo mới khách hàng -> Nhập Số điện thoại, Họ tên, Số CCCD, Số GPLX, Địa chỉ thường trú.
   - Bấm "Tiếp tục".
4. **Bước 4 (Thanh toán & Hợp đồng):**
   - Chọn loại hợp đồng ("Mẫu hệ thống" hoặc "Tải lên file scan PDF hợp đồng giấy").
   - Nhập Tiền cọc giữ xe (mặc định 10,000,000đ).
   - Chọn Trạng thái thanh toán (Đã cọc / Đã thanh toán toàn bộ / Còn nợ).
   - Kiểm tra cột Hóa đơn tạm tính bên phải (Tiền thuê gốc + Phí giao xe = Tổng tiền thanh toán; Tiền chi trả hoa hồng chủ xe được tính tự động theo % chiết khấu của chủ xe đó).
   - Bấm "Tạo đơn & Giao xe".
5. **Kế quả:** Đơn thuê mới được lưu vào `rentals`, trạng thái xe chuyển sang `rented`, khách hàng được cộng 1 đơn thuê active, hiển thị Modal hóa đơn thành công.

---

### 2.2. Flow 2: Nhận trả xe & Kết thúc hợp đồng (Return Car Flow)
1. **Bước 1:** Người dùng vào trang Quản lý Đội xe (`/fleet`) hoặc Quản lý Đơn thuê (`/contracts`), chọn xe/hợp đồng đang ở trạng thái `rented`/`active`.
2. **Bước 2:** Bấm nút "Nhận trả xe".
3. **Bước 3:** Nhập Số KM lúc trả xe (Validation bắt buộc: `Số KM trả >= Số KM lúc nhận`).
4. **Bước 4:** Chọn Mức nhiên liệu lúc trả (8/8, 6/8, 4/8, 2/8).
5. **Bước 5:** Nhập Phụ phí phát sinh nếu có (ví dụ: trả trễ giờ, chưa rửa xe, quá số KM quy định).
6. **Bước 6:** Chọn Tình trạng thanh toán cuối cùng ('paid' hoặc 'debt').
7. **Bước 7:** Bấm "Xác nhận trả xe".
8. **Kết quả:** Trạng thái hợp đồng chuyển thành `completed`, số KM hiện tại của xe được cập nhật = `returnKm`, trạng thái xe tự động giải phóng về `ready`, số đơn đang thuê của khách hàng tự động giảm 1.

---

### 2.3. Flow 3: Tạo & Xuất báo giá Chuyến đi Dịch vụ Tài xế (Driver Service Quote Flow)
1. **Bước 1:** Người dùng vào trang Quản lý Đơn Dịch vụ (`/services`).
2. **Bước 2:** Bấm nút "Thêm đơn dịch vụ".
3. **Bước 3:** Chọn xe phục vụ, chọn tài xế (hoặc chọn tạo nhanh tài xế mới inline).
4. **Bước 4:** Nhập Điểm đón, Điểm trả, Ngày giờ phục vụ.
5. **Bước 5:** Nhập Số KM bắt đầu và Số KM kết thúc -> Quãng đường (KM) tự động tính.
6. **Bước 6:** Nhập Đơn giá cước (đ/KM) và Phụ phí vé cầu đường/bãi xe.
7. **Bước 7:** Kiểm tra % Chiết khấu tài xế (mặc định 80%) -> Số tiền tài xế thực nhận tự động tính. Bấm "Lưu đơn dịch vụ".
8. **Bước 8 (Xuất báo giá gửi khách Zalo):**
   - Bấm nút "Báo giá / Chi tiết" tại dòng đơn vừa tạo.
   - Lựa chọn 1: Bấm "Sao chép văn bản báo giá Zalo" -> Hệ thống copy đoạn text báo giá đầy đủ chi tiết vào bộ nhớ tạm.
   - Lựa chọn 2: Bấm "Chụp & Sao chép Ảnh Zalo (Ctrl+V)" -> Thư viện `html2canvas` chụp ảnh màn hình phiếu báo giá PNG đẹp mắt và copy ảnh trực tiếp để người dùng chỉ cần ấn `Ctrl + V` gửi trong cửa sổ chat Zalo cho khách.

---

### 2.4. Flow 4: Tra cứu Công khai dành cho Chủ xe (/thong-tin-xe)
1. **Bước 1:** Chủ xe/Đối tác truy cập đường dẫn công khai `/thong-tin-xe` hoặc `/public`.
2. **Bước 2:** Nhập Biển số xe (VD: `51F-123.45`) HOẶC Số điện thoại cá nhân vào ô tra cứu.
3. **Bước 3:** Bấm "Tra cứu ngay".
4. **Bước 4:** Hệ thống chuẩn hóa chuỗi nhập, tìm kiếm trong cơ sở dữ liệu xe.
5. **Bước 5:** Nếu SĐT sở hữu nhiều xe, hiển thị danh sách thẻ chọn xe.
6. **Bước 6:** Màn hình trả về thẻ thông tin xe chi tiết: Trạng thái hiện tại (Đang trống / Đang cho thuê / Bảo trì), Thời gian dự kiến trả xe còn lại (nếu đang chạy), Số KM đồng hồ hiện tại và Hạn đăng kiểm xe.

---

### 2.5. Flow 5: Ghi nhận Chi phí & Thanh toán Chiết khấu Chủ xe (Expense & Owner Payout Flow)
1. **Ghi nhận chi phí vận hành:**
   - Người dùng vào `/expenses` -> Bấm "Ghi nhận chi phí".
   - Nhập Nội dung chi, Số tiền, Danh mục (Bảo dưỡng, Sửa chữa, Vệ sinh, Giấy tờ, Chi trả chủ xe...), Ngày chi, Chọn biển số xe liên kết -> Bấm "Ghi nhận".
2. **Thanh toán chiết khấu chủ xe:**
   - Người dùng vào trang Chi tiết Chủ xe (`/owners?id=...`) hoặc Tab 3 trang Chi phí (`/expenses`).
   - Xem tổng doanh số xe phát sinh và số tiền chiết khấu phải trả cho chủ xe được tự động tính theo % thỏa thuận (ví dụ: 75%).
   - Bấm nút **"Tạo phiếu chi"**.
   - Hệ thống tự động khởi tạo 1 bản ghi chi phí mới với danh mục "Chiết khấu chủ xe", ghi nhận số tiền đã chi trả cho đối tác.

---

### 2.6. Flow 6: Cài đặt Giao diện, Mẫu Hợp đồng & Sao lưu (Settings Management Flow)
1. **Tùy biến thương hiệu:** Vào `/settings` -> Chọn màu chủ đạo trong bộ màu (ví dụ: Xanh lá `#006837`) -> Thay đổi logo -> Bấm "Lưu cấu hình giao diện". Toàn bộ màu sắc các nút bấm và thanh điều hướng đổi màu tức thì.
2. **Thử nghiệm tải trọng 500 bản ghi:** Vào Tab Giao diện -> Bấm "Nạp 500 bản ghi ngẫu nhiên" -> Hệ thống sinh 500 xe, hợp đồng, khách hàng mẫu để kiểm tra tốc độ render bảng. Bấm "Đặt lại dữ liệu ban đầu" để reset.
3. **Biên soạn mẫu hợp đồng:** Vào Tab Mẫu hợp đồng -> Chỉnh sửa văn bản và bấm chèn nhanh các biến `{ten_khach_hang}`, `{bien_so_xe}` -> Bấm "Xem trước Bản in PDF" để kiểm tra giao diện in A4.
4. **Giám sát bảo mật:** Vào Tab Bảo mật & Anti-Spam -> Kiểm tra danh sách nhật ký các lượt đăng nhập thành công, đăng nhập sai và các mốc thời gian bị khóa brute-force.

---

### 2.7. Flow 7: Đăng nhập Bảo mật & Khóa Chống Brute-Force (Security Login Flow)
1. Người dùng mở ứng dụng khi chưa đăng nhập -> Màn hình Đăng nhập hiển thị.
2. Nhập Username & Password.
3. Nếu nhập sai 1-2 lần: Hiển thị thông báo lỗi số lần sai còn lại.
4. Nếu nhập sai từ 3 lần: Kích hoạt Mã xác thực toán học CAPTCHA (`N1 + N2 = ?`), người dùng phải tính đúng kết quả mới được ấn Đăng nhập.
5. Nếu nhập sai đến 5 lần: Kích hoạt chế độ Khóa đăng nhập (Lockout) trong **60 giây**. Nút đăng nhập bị vô hiệu hóa kèm đồng hồ đếm ngược. Hệ thống lưu sự kiện `LOCKOUT` vào nhật ký bảo mật.
6. Đăng nhập thành công: Lưu trạng thái `agreen_auth = true`, ghi nhật ký `LOGIN_SUCCESS`, chuyển vào ứng dụng.
7. Đổi tài khoản Admin: Admin bấm vào Avatar trên thanh Topbar -> Chọn "Chỉnh sửa tài khoản" -> Cập nhật Username, Mật khẩu mới hoặc URL Avatar.

---

## 3. Danh sách API Endpoints

Bảng tổng hợp đặc tả đầy đủ các API Endpoints (phù hợp với Cấu trúc Cơ sở dữ liệu PostgreSQL và Các hàm Thao tác Trạng thái trong hệ thống):

| Method | Path | Mô tả mục đích | Input / Output | Dùng ở trang nào |
|---|---|---|---|---|
| POST | `/api/auth/login` | Xử lý đăng nhập admin, xác thực CAPTCHA & kiểm tra khóa Brute-force | Input: `username`, `password`, `captcha`<br/>Output: `token`, `user` | `Login.tsx` |
| POST | `/api/auth/logout` | Đăng xuất tài khoản quản trị | Output: `success: true` | Topbar / Sidebar |
| PUT | `/api/auth/profile` | Đổi tên đăng nhập, mật khẩu và avatar tài khoản admin | Input: `username`, `password`, `avatar`<br/>Output: `user` | AccountDropdown |
| GET | `/api/vehicles` | Lấy danh sách toàn bộ xe (hỗ trợ lọc theo status, biển số, dải giá, chủ xe, màu) | Output: `Car[]` | `FleetManagement`, `Dashboard`, `CreateRental`, `ServiceOrders` |
| POST | `/api/vehicles` | Thêm xe mới vào đội xe | Input: Thông tin `Car`<br/>Output: `Car` vừa tạo | `FleetManagement`, `CreateRental` |
| GET | `/api/vehicles/:id` | Xem chi tiết 1 xe (bao gồm lịch thuê, lịch bảo trì, hạn giấy tờ) | Output: `Car` chi tiết | `FleetManagement`, `Dashboard` |
| PUT | `/api/vehicles/:id` | Cập nhật thông tin xe, điều chỉnh giá thuê (Giờ/Ngày/Tuần), số KM, hạn đăng kiểm/bảo hiểm | Input: `Partial<Car>`<br/>Output: `Car` cập nhật | `FleetManagement` |
| DELETE | `/api/vehicles/:id` | Xóa xe khỏi hệ thống (chỉ xóa khi xe không ở trạng thái 'rented') | Output: `success: true` | `FleetManagement` |
| PATCH | `/api/vehicles/:id/status` | Cập nhật nhanh trạng thái xe ('ready', 'rented', 'maintenance', 'suspended') | Input: `status`, `customer`, `timeRemaining`<br/>Output: `Car` | `Dashboard`, `FleetManagement` |
| GET | `/api/customers` | Lấy danh sách khách hàng (tìm kiếm tên, SĐT, phân loại VIP/Cảnh báo) | Output: `Customer[]` | `Customers`, `CreateRental` |
| POST | `/api/customers` | Thêm hồ sơ khách hàng mới | Input: Thông tin `Customer`<br/>Output: `Customer` | `Customers`, `CreateRental` |
| GET | `/api/customers/:id` | Xem chi tiết hồ sơ & lịch sử giao dịch thuê xe của khách | Output: `Customer`, `Rental[]` | `Customers` |
| PUT | `/api/customers/:id` | Cập nhật thông tin khách hàng, số CCCD, GPLX, phân loại, ghi chú nội bộ | Input: `Partial<Customer>`<br/>Output: `Customer` | `Customers` |
| GET | `/api/owners` | Lấy danh sách chủ xe / đối tác ký gửi | Output: `Owner[]` | `Owners`, `FleetManagement`, `CreateRental` |
| POST | `/api/owners` | Thêm mới đối tác chủ xe ký gửi (kèm tỷ lệ % chiết khấu thỏa thuận) | Input: Thông tin `Owner`<br/>Output: `Owner` | `Owners`, `FleetManagement` |
| PUT | `/api/owners/:id` | Cập nhật thông tin đối tác chủ xe | Input: `Partial<Owner>`<br/>Output: `Owner` | `Owners` |
| DELETE | `/api/owners/:id` | Xóa đối tác chủ xe | Output: `success: true` | `Owners` |
| GET | `/api/contracts` | Lấy danh sách hợp đồng cho thuê xe (lọc theo trạng thái, khoảng thời gian) | Output: `Rental[]` | `Contracts`, `Dashboard` |
| POST | `/api/contracts` | Khởi tạo đơn thuê / hợp đồng cho thuê xe mới | Input: Thông tin `Rental`<br/>Output: `Rental` | `CreateRental` |
| GET | `/api/contracts/:id` | Xem chi tiết hợp đồng (bao gồm vi phạm giao thông, ảnh bàn giao, timeline mốc hoạt động) | Output: `Rental` chi tiết | `Contracts`, `FleetManagement` |
| PUT | `/api/contracts/:id` | Chỉnh sửa thông tin đơn thuê / hợp đồng, tổng tiền, ngày thuê/trả, tệp hợp đồng | Input: `Partial<Rental>`<br/>Output: `Rental` | `Contracts` |
| POST | `/api/contracts/:id/complete` | Nhận trả xe & kết thúc hợp đồng thuê | Input: `endKm`, `extraFee`, `endFuel`, `paymentStatus`<br/>Output: `Rental` | `FleetManagement`, `Contracts` |
| POST | `/api/contracts/:id/violations` | Ghi nhận chi phí phát sinh / vi phạm giao thông / phạt nguội vào hợp đồng | Input: Thông tin `Violation`<br/>Output: `Violation[]` | `Contracts` |
| PUT | `/api/contracts/:id/violations/:vId` | Cập nhật thông tin vi phạm giao thông | Input: `Partial<Violation>`<br/>Output: `Violation` | `Contracts` |
| DELETE | `/api/contracts/:id/violations/:vId` | Xóa lịch sử vi phạm giao thông | Output: `success: true` | `Contracts` |
| GET | `/api/services/orders` | Lấy danh sách đơn dịch vụ tài xế cước chuyến / KM | Output: `ServiceOrder[]` | `ServiceOrders` |
| POST | `/api/services/orders` | Tạo mới đơn dịch vụ tài xế (tự động tính cước KM & tiền chiết khấu tài xế) | Input: Thông tin `ServiceOrder`<br/>Output: `ServiceOrder` | `ServiceOrders` |
| PUT | `/api/services/orders/:id` | Cập nhật đơn dịch vụ tài xế | Input: `Partial<ServiceOrder>`<br/>Output: `ServiceOrder` | `ServiceOrders` |
| DELETE | `/api/services/orders/:id` | Xóa đơn dịch vụ tài xế | Output: `success: true` | `ServiceOrders` |
| PATCH | `/api/services/orders/:id/payment` | Đổi trạng thái thanh toán đơn dịch vụ ('paid' / 'unpaid') | Output: `ServiceOrder` | `ServiceOrders` |
| GET | `/api/drivers` | Lấy danh sách tài xế lái xe dịch vụ | Output: `Driver[]` | `ServiceOrders` |
| POST | `/api/drivers` | Thêm tài xế mới vào danh sách | Input: Thông tin `Driver`<br/>Output: `Driver` | `ServiceOrders` |
| PUT | `/api/drivers/:id` | Cập nhật thông tin tài xế, % chiết khấu mặc định, avatar, xe phụ trách | Input: `Partial<Driver>`<br/>Output: `Driver` | `ServiceOrders` |
| DELETE | `/api/drivers/:id` | Xóa tài xế | Output: `success: true` | `ServiceOrders` |
| GET | `/api/expenses` | Lấy sổ thu chi & chi phí vận hành hệ thống | Output: `Expense[]` | `Expenses`, `FleetManagement` |
| POST | `/api/expenses` | Ghi nhận chi phí vận hành mới / lập phiếu chi chiết khấu cho chủ xe | Input: Thông tin `Expense`<br/>Output: `Expense` | `Expenses`, `FleetManagement`, `Owners` |
| GET | `/api/reports/summary` | Thống kê tổng hợp doanh thu, chi phí, lợi nhuận ròng & tỷ lệ khai thác đội xe | Input: `timeRange`, `startDate`, `endDate`<br/>Output: Metrics báo cáo | `Reports` |
| GET | `/api/public/status` | Cổng tra cứu tình trạng xe công khai dành cho đối tác | Input: `plate` hoặc `phone`<br/>Output: `Car[]` công khai | `PublicStatus` |
| GET | `/api/settings` | Lấy cấu hình hệ thống (màu chủ đạo, logo, mẫu hợp đồng) | Output: `AppSettings` | `Settings`, `App` |
| PUT | `/api/settings` | Cập nhật cấu hình giao diện & logo thương hiệu | Input: `Partial<AppSettings>`<br/>Output: `AppSettings` | `Settings` |
| GET | `/api/security/logs` | Lấy danh sách nhật ký bảo mật audit logs | Output: `SecurityLog[]` | `Settings` |
| DELETE | `/api/security/logs` | Xóa lịch sử nhật ký bảo mật | Output: `success: true` | `Settings` |

---

## 4. Cấu trúc dữ liệu chính (PostgreSQL Database Schema)

Cấu trúc cơ sở dữ liệu PostgreSQL từ `database/schema.sql` kết hợp các kiểu dữ liệu TypeScript trong `AppContext.tsx`:

```mermaid
erdiagram
    users ||--o{ contracts : "created_by"
    users ||--o{ expenses : "created_by"
    owners ||--o{ vehicles : "owns"
    vehicles ||--o{ contracts : "used_in"
    vehicles ||--o{ service_orders : "serviced_by"
    vehicles ||--o{ expenses : "incurs"
    customers ||--o{ contracts : "rents"
    drivers ||--o{ service_orders : "operates"
    contracts ||--o{ expenses : "related_expense"

    users {
        uuid id PK
        string username UK
        string email UK
        string password_hash
        string full_name
        string role
        boolean is_active
        timestamp created_at
    }

    owners {
        uuid id PK
        string name
        string phone UK
        string email
        string address
        string id_card
        string bank_account
        string bank_name
        number commission_rate
        text notes
    }

    vehicles {
        string id PK "Plate Number e.g. 51F-123.45"
        string brand
        string model
        int year
        string color
        int seats
        string status "ready | rented | maintenance | suspended"
        int current_mileage
        numeric daily_rate
        numeric price_per_hour
        numeric price_per_week
        uuid owner_id FK
        date registration_expiry
        date insurance_expiry
        date license_expiry
        text image_url
    }

    customers {
        uuid id PK
        string full_name
        string phone UK
        string id_card UK "CCCD"
        string driver_license "GPLX"
        string address
        string classification "normal | vip | warning"
        string status "verified | expired"
        text notes
    }

    contracts {
        string id PK "e.g. RNT-001"
        string vehicle_id FK
        string customer_phone FK
        string customer_name
        timestamp start_date
        timestamp end_date
        timestamp returned_at
        numeric rental_fee
        numeric delivery_fee
        numeric extra_fee
        numeric deposit_amount
        numeric total_amount
        numeric owner_commission_amount
        string payment_status "deposit | paid | debt"
        string status "pending | active | completed | cancelled"
        int start_mileage
        int end_mileage
        string start_fuel
        string end_fuel
        string source "system | uploaded"
        text file_url
        jsonb violations
        jsonb condition_images
    }

    drivers {
        string id PK "e.g. DRV-001"
        string name
        string phone
        string license_number
        string license_class "B2 | C"
        string status "available | on_trip | off"
        int total_trips
        string assigned_car_id FK
        numeric commission_rate
        text avatar
    }

    service_orders {
        string id PK "e.g. SRV-001"
        string car_id FK
        string driver_id FK
        string pickup_location
        string dropoff_location
        timestamp service_date
        int start_km
        int end_km
        int distance_km
        numeric price_per_km
        numeric extra_fee
        numeric total_amount
        numeric driver_commission_rate
        numeric driver_commission_amount
        string payment_status "paid | unpaid"
        string status "completed | ongoing | cancelled"
    }

    expenses {
        uuid id PK
        string category "Bảo dưỡng | Sửa chữa | Vệ sinh | Giấy tờ | Chiết khấu chủ xe | Khác"
        numeric amount
        date expense_date
        string vehicle_id FK
        string title
        string location
    }
```

---

## 5. Các quy tắc nghiệp vụ đang cài cứng trong code (Hardcoded Business Rules)

Dưới đây là toàn bộ các quy tắc nghiệp vụ và công thức toán học quan trọng được cài đặt trực tiếp trong mã nguồn:

### 5.1. Quy tắc tính Giá Thuê & Phụ phí Cuối tuần (`CreateRental.tsx`)
- **Đơn giá gốc (`baseRate`):**
  - Thuê theo giờ (`hourly`): Lấy `car.pricePerHour` (mặc định 100,000đ/giờ).
  - Thuê theo ngày (`daily`): Lấy `car.pricePerDay` (mặc định 800,000đ/ngày).
  - Thuê theo tuần (`weekly`): Lấy `car.pricePerWeek` (mặc định 5,000,000đ/tuần).
- **Hệ số phụ phí cuối tuần (`surchargeFactor`):**
  - Nếu `isWeekend === true`, áp dụng công thức: `surchargeFactor = 1.0 + (weekendSurchargePercent / 100)` (mặc định +20%).
  - Nếu không áp dụng cuối tuần: `surchargeFactor = 1.0`.
- **Tiền thuê gốc tính toán (`computedRentalFee`):**
  - `computedRentalFee = Math.round(duration * baseRate * surchargeFactor)`
- **Tổng tiền thanh toán đơn thuê (`totalAmount`):**
  - `totalAmount = rentalFee + deliveryFee + extraFee + violationTotal`

---

### 5.2. Quy tắc tính Hoa hồng Chi trả Chủ xe (Owner Commission Rate)
- Mỗi đối tác chủ xe được thiết lập một tỷ lệ `% Chiết khấu` thỏa thuận (`commissionRate`, mặc định 75%).
- Khi tạo đơn thuê xe tự lái, số tiền chủ xe được hưởng tự động tính toán:
  - `ownerCommissionAmount = Math.round((rentalFee * ownerCommissionRate) / 100)`
- Khi bấm nút **"Tạo phiếu chi"** ở hồ sơ chủ xe, hệ thống tính tổng `ownerCommissionAmount` của tất cả các hợp đồng phát sinh từ các xe thuộc quyền sở hữu của chủ xe đó để lập phiếu chi danh mục `"Chiết khấu chủ xe"`.

---

### 5.3. Quy tắc tính Cước Chuyến & Hoa hồng Tài xế (`ServiceOrders.tsx`)
- **Tính quãng đường phục vụ (`distance`):**
  - `distance = Math.max(0, endKm - startKm)`
- **Tổng cước chuyến đi thu khách (`totalAmount`):**
  - `totalAmount = Math.round(distance * pricePerKm + extraFee)` (mặc định đơn giá `pricePerKm = 15,000đ/KM`).
- **Chiết khấu tài xế thực nhận (`driverCommissionAmount`):**
  - Lấy `% Chiết khấu` tài xế (`driverCommissionRate`, mặc định 80%).
  - `driverCommissionAmount = Math.round(totalAmount * (driverCommissionRate / 100))`
- **Tự động cập nhật dữ liệu liên quan khi tạo đơn dịch vụ (`addServiceOrder`):**
  - Số KM hiện tại của xe (`car.km`) tự động cập nhật: `car.km = Math.max(car.km, order.endKm)`.
  - Số chuyến chạy của tài xế (`driver.totalTrips`) tự động cộng thêm 1.

---

### 5.4. Quy tắc Tự động Đồng bộ Trạng thái Xe & Hợp đồng (`AppContext.tsx`)
- Khi khởi tạo đơn thuê `active` hoặc `pending`: xe chuyển sang `status: 'rented'`, đồng thời lưu tên khách hàng và thời gian thuê còn lại.
- Khi trả xe (`completeRental`): xe được giải phóng về `status: 'ready'`, số KM đồng hồ cập nhật `km = Math.max(car.km, endKm)`, xóa thông tin `customer`.
- **Cơ chế Tự động Bảo vệ (Auto-Release Guard Effect):**
  - Hệ thống chạy `useEffect` giám sát danh sách hợp đồng. Nếu phát hiện xe có `status === 'rented'` nhưng KHÔNG có bất kỳ hợp đồng nào đang ở trạng thái `status === 'active'`, hệ thống tự động giải phóng xe về `status: 'ready'` và xóa thông tin khách thuê.

---

### 5.5. Quy tắc Phân loại Khách hàng & Cảnh báo GPLX (`Customers.tsx`)
- **Khách VIP (`vip`):** Hiển thị tag ⭐ VIP màu vàng, có lịch sử thuê nhiều, thanh toán nhanh.
- **Khách Cần Chú Ý (`warning`):** Hiển thị tag ⚠️ Cần chú ý màu đỏ, cảnh báo từng có lịch sử trả xe trễ hoặc vi phạm.
- **Kiểm tra hạn GPLX:** Nếu giấy phép lái xe hết hạn, hiển thị badge đỏ `GPLX hết hạn`.

---

### 5.6. Quy tắc Cảnh báo Hạn Giấy tờ Xe & Trễ Hạn Trả (`FleetManagement.tsx` & `Dashboard.tsx`)
- Giấy tờ giám sát gồm: Hạn đăng kiểm (`expiryRegistration`), Hạn bảo hiểm TNDS (`expiryInsurance`), Hạn phù hiệu xe (`expiryLicense`).
- **Ngưỡng thời gian cảnh báo:**
  - `diffDays <= 0`: Đã hết hạn! Tag màu đỏ (`#dc2626`).
  - `diffDays <= 30`: Còn X ngày (Sắp hết). Tag màu vàng/cam (`#b45309`).
  - `diffDays > 30`: Còn X ngày (An toàn). Tag màu xanh (`#047857`).
- **Cảnh báo Xe Quá Hạn Trả (`Dashboard.tsx`):** Nếu xe `status === 'rented'` và thời gian còn lại có chứa từ `'Trễ'` (hoặc vượt mốc ngày trả dự kiến), hệ thống bật Banner cảnh báo đỏ **"CẢNH BÁO: Xe quá hạn trả! Liên hệ ngay khách hàng"**.

---

### 5.7. Quy tắc Bảo mật Đăng nhập Admin & Chống Spammer (`Login.tsx`)
- Tài khoản khởi tạo mặc định: Username `admin`, Mật khẩu `agreen2024`.
- **Khóa Chống Brute-Force (Lockout):** Nhập sai mật khẩu 5 lần liên tiếp -> Hệ thống kích hoạt khóa đăng nhập tạm thời trong **60 giây** (`LOCKOUT_UNTIL_KEY`), vô hiệu hóa nút submit.
- **Mã CAPTCHA Toán Học (Math CAPTCHA):** Nhập sai từ 3 lần trở lên -> Hiển thị ô giải phép tính ngẫu nhiên `N1 + N2 = ?` mới cho phép gửi form.
- **Nhật ký Bảo mật (Audit Log):** Lưu trữ 50 sự kiện gần nhất (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOCKOUT`, `PASSWORD_CHANGE`) vào LocalStorage key `agreen_security_logs`.

---

### 5.8. Quy tắc Dynamic Design System & Theme Variable Injection (`AppContext.tsx`)
- Màu chủ đạo được lưu trong `settings.primaryColor` (mặc định `#006837`).
- Khi thay đổi màu theme, hệ thống gọi hàm `darkenColor(settings.primaryColor, 15)` để tự động tính toán màu hover sậm hơn 15%, sau đó tiêm trực tiếp vào biến CSS gốc của trang web:
  - `document.documentElement.style.setProperty('--primary', settings.primaryColor)`
  - `document.documentElement.style.setProperty('--primary-hover', hoverColor)`
- Rollback Logo: Mảng `logoHistory` lưu trữ tất cả các logo từng được sử dụng. Khi bấm "Hoàn tác logo cũ", hệ thống khôi phục logo liền trước trong lịch sử.

---
