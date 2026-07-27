# Danh sách các Lỗi Logic, Bug và Bất Nhất trong Codebase

Dưới đây là báo cáo kiểm tra toàn bộ codebase (`src/`, `server/`, `database/`) được phân loại theo mức độ nghiêm trọng.

## 🔴 Mức độ: Critical (Nghiêm trọng)

### 1. Bất nhất Kiến trúc Database (Schema Inconsistency)
- **File:** `database/schema.sql` (Line 147-175, 198-218) và `server/server.js` (Line 321-401)
- **Mô tả:** 
  - Table `rentals` (được dùng làm "Source of Truth" và xử lý tất cả các API Tạo, Sửa, Xóa trong `server.js`) đang sử dụng các trường `car_id VARCHAR(20)` (lưu biển số) và `customer_phone VARCHAR(20)` thay vì khóa ngoại UUID đúng chuẩn. Điều này phá vỡ tính toàn vẹn dữ liệu (Relational Integrity) đối với bảng `vehicles` và `customers`.
  - Trong khi đó, Table `contracts` lại được thiết kế chuẩn mực với `vehicle_id UUID REFERENCES vehicles(id)` và `customer_id UUID REFERENCES customers(id)`, nhưng bảng này lại bị bỏ hoang, hoàn toàn không có API `POST`, `PUT`, `DELETE` trong `server.js` để ghi dữ liệu.
- **Hệ quả:** Dữ liệu đơn thuê có thể chứa thông tin biển số xe hoặc số điện thoại không tồn tại trong hệ thống. Nếu một khách hàng đổi số điện thoại hoặc một xe bị đổi biển số, toàn bộ liên kết đơn thuê sẽ bị đứt gãy.

### 2. Sinh ID dễ bị trùng lặp (Primary Key Collision)
- **File:** `src/pages/CreateRental.tsx` (Line 299) và `src/pages/ServiceOrders.tsx` (Lines 340, 398, 486)
- **Mô tả:** 
  - Code Frontend sinh ID theo cú pháp: `` `RNT-${Date.now().toString().slice(-4)}` ``
  - Việc dùng `.slice(-4)` để lấy 4 chữ số cuối của `Date.now()` (tính bằng milliseconds) nghĩa là dải số sinh ra sẽ quay vòng lặp lại chính xác mỗi 10,000 milliseconds (10 giây). 
- **Hệ quả:** Nếu hai người dùng tạo đơn thuê, hoặc lưu thông tin tài xế/đơn dịch vụ cách nhau đúng một khoảng chu kỳ 10 giây (hoặc vô tình thao tác tạo nhiều bản ghi cùng một giây), ID sinh ra sẽ hoàn toàn giống nhau, dẫn tới lỗi xung đột Khóa chính (Primary Key Conflict) dưới PostgreSQL.

---

## 🟡 Mức độ: Medium (Trung bình)

### 3. Hardcode Ngày tháng tĩnh trong Filter
- **File:** `src/pages/Expenses.tsx` (Line 115)
- **Mô tả:** Code đang hardcode biến `const today = new Date('2026-07-15');` thay vì lấy ngày hiện tại thực tế qua `new Date()`.
- **Hệ quả:** Tính năng lọc danh sách chi phí theo "7 ngày gần đây" hoặc "30 ngày gần đây" sẽ luôn luôn được tính lùi từ ngày `15/07/2026`, làm cho các báo cáo sau ngày này không còn chính xác.

### 4. Lỗi Sai lệch Múi giờ khi tạo Chi phí (Timezone Bug)
- **File:** `src/pages/FleetManagement.tsx` (Line 101) và `server/server.js` (Line 423)
- **Mô tả:** 
  - Frontend và Backend lấy ngày sinh chi phí qua code: `new Date().toISOString().split('T')[0]`.
  - Hàm `.toISOString()` luôn trả về giờ chuẩn UTC (+0). Ở Việt Nam (UTC+7), từ 00:00 sáng đến 06:59 sáng, giờ UTC vẫn đang thuộc về ngày hôm trước.
- **Hệ quả:** Các khoản chi phí, đơn dịch vụ tạo vào buổi sáng sớm (trước 7 giờ sáng) tại Việt Nam sẽ bị lưu nhầm thành ngày hôm trước trong CSDL.

### 5. Race Condition khi tạo Khách hàng và Đơn thuê đồng thời
- **File:** `src/pages/CreateRental.tsx` (Lines 281-294 và 325)
- **Mô tả:** 
  - Khi người dùng chọn chế độ "Tạo mới khách hàng" và ấn "Tạo đơn", code gọi hàm `addCustomer()` và ngay lập tức gọi tiếp hàm `addRental()`. 
  - Cả hai hàm này đều gọi `apiFetch` (bất đồng bộ) trong `AppContext.tsx` nhưng không được sử dụng `await`. 
- **Hệ quả:** Đơn thuê có thể được đẩy lên backend trước khi khách hàng mới kịp được lưu vào CSDL, gây ra thiếu đồng bộ dữ liệu hoặc thất thoát thông tin nếu mạng gặp vấn đề ở một trong hai request.

---

## 🟢 Mức độ: Minor (Nhẹ)

### 6. Mã hóa Mật khẩu thiếu an toàn (No Salt Hashing)
- **File:** `server/server.js` (Line 574-576)
- **Mô tả:** Cơ chế hash mật khẩu đang sử dụng thuật toán `sha256` thuần (`crypto.createHash('sha256').update(password).digest('hex')`) mà không thêm chuỗi "Salt" (chuỗi nhiễu ngẫu nhiên).
- **Hệ quả:** Kẻ tấn công nếu lấy được database có thể dùng kỹ thuật Rainbow Table (tra bảng băm có sẵn) để dịch ngược mật khẩu của các Admin một cách dễ dàng. Khuyến nghị chuyển sang sử dụng thư viện `bcrypt`.

### 7. Lỗi Parse JSON ngầm (Silent JSON Parse Error)
- **File:** `src/context/AppContext.tsx` (Line 499 và 537)
- **Mô tả:** Khi lấy dữ liệu mảng hình ảnh `condition_images` hoặc `gallery_urls` dạng JSON text từ PostgreSQL, code dùng khối `try...catch` nhưng lại ém (swallow) lỗi bằng cách trả về `[]` nếu parse thất bại.
- **Hệ quả:** Nếu dữ liệu trong DB vô tình bị hỏng do thao tác lưu (malformed JSON), toàn bộ hình ảnh của xe hoặc hình ảnh bàn giao sẽ bị biến mất trên giao diện mà Frontend và Backend không lưu lại log lỗi (console error/log) nào để cảnh báo lập trình viên sửa chữa.
