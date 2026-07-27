# Báo Cáo Chẩn Đoán Lỗi

Dưới đây là kết quả kiểm tra mã nguồn cho 2 vấn đề bạn đang gặp phải. **Hệ thống chưa thực hiện bất kỳ thay đổi nào vào code**, đây chỉ là báo cáo chẩn đoán nguyên nhân gốc rễ.

## Vấn đề 1: Chọn tài xế (Bắt nhập SĐT mới thay vì chọn sẵn)
* **File liên quan:** `src/pages/ServiceOrders.tsx` (dòng 1693 - 1754)
* **Mức độ tin cậy:** Chắc chắn (Cần bạn xác nhận thêm)
* **Nguyên nhân / Hiện trạng:**
  1. **Thực tế code CÓ chức năng search/select:** Kiểm tra mã nguồn `ServiceOrders.tsx` cho thấy frontend đã được lập trình sẵn chức năng tìm kiếm và chọn tài xế từ danh sách (Dropdown `<select>` kết hợp ô `<input>` tìm kiếm). Tính năng này được quản lý bởi biến trạng thái `isQuickCreateDriver`.
  2. **API GET có tồn tại và được gọi:** Trong `src/context/AppContext.tsx` (dòng 674), frontend có gọi API `apiFetch('/drivers')` để lấy danh sách tài xế có sẵn từ server.
  3. **Lý do bạn chỉ thấy ô nhập số điện thoại mới:** Giao diện có một nút bấm chuyển đổi giữa 2 chế độ: **"← Chọn sẵn"** và **"+ Tạo mới"**. Nếu bạn đang thấy ô nhập "Họ tên *" và "SĐT *" có nghĩa là form đang ở chế độ tạo nhanh (`isQuickCreateDriver = true`). Mặc định khi mở form, chế độ này là `false` (tức là hiển thị Chọn sẵn). 
  4. **Nghi ngờ nhầm lẫn màn hình:** Trong file `CreateRental.tsx` (Tạo đơn thuê xe), hệ thống **không có chức năng chọn tài xế** vì đây là luồng cho thuê xe *tự lái*. Ở màn hình này, có một form tạo "Khách hàng mới" hoặc "Thêm xe mới (Chủ xe)" yêu cầu nhập SĐT. Rất có thể bạn đang nhầm lẫn giữa khái niệm "Khách hàng/Chủ xe" và "Tài xế" ở form này.

* **Cần bạn cung cấp thêm:** Bạn vui lòng kiểm tra lại trong form Đơn Dịch Vụ (ServiceOrders), bạn có thấy nút **"← Chọn sẵn"** (màu xanh lá, có gạch chân) không? Nếu bấm vào đó nó sẽ quay lại màn hình chọn tài xế cũ. Hoặc cho tôi biết bạn đang click vào mục nào trên menu để ra màn hình bạn đang gặp lỗi.

---

## Vấn đề 2: Mất dữ liệu sau khi F5 (Làm mới trang)
* **File liên quan:** 
  - `src/context/AppContext.tsx` (các hàm `addRental`, `addServiceOrder`, `addCar`, `addDriver`, v.v.)
  - `src/pages/CreateRental.tsx` (dòng 330)
* **Nguyên nhân chính xác:** Cơ chế **Optimistic UI (Cập nhật giao diện lạc quan)** không bắt lỗi backend.
* **Mức độ tin cậy:** Chắc chắn 100%
* **Giải thích chi tiết:**
  Khi bạn ấn lưu một dữ liệu mới (ví dụ Đơn thuê xe), frontend React thực hiện 2 việc cùng lúc:
  1. Thêm ngay dữ liệu đó vào state của giao diện và bắn ra thông báo thành công (`showToast('Tạo đơn thuê xe thành công!', 'success')`).
  2. Gọi ngầm một API (`apiFetch('/rentals', { method: 'POST' })`) để lưu vào CSDL PostgreSQL.
  
  **Vấn đề cốt lõi:** Frontend không hề chờ (`await`) xem API số (2) có lưu thành công hay không. Hàm `addRental` hay `addServiceOrder` trong `AppContext.tsx` bắn request POST lên server rồi `.catch(() => {})` một cách lặng lẽ. Do đó, nếu API thất bại (do mạng, backend báo thiếu trường, lỗi 500, v.v.), giao diện của bạn **vẫn báo thành công** và hiển thị dữ liệu (vì state UI đã được cập nhật ở bước 1). Nhưng thực tế dữ liệu chưa bao giờ vào được Database.
  Do đó, khi bạn ấn F5 tải lại trang, website sẽ gọi lại API GET để load toàn bộ dữ liệu từ Database, và vì dữ liệu ban nãy lưu thất bại nên nó sẽ "biến mất".

* **Đề xuất khắc phục (trong bước sau):** Chuyển tất cả các hàm `add...` trong `AppContext.tsx` thành `async / await`. Chỉ khi nào API POST trả về kết quả `success` thì mới cập nhật state UI và gọi `showToast` thành công. Nếu API lỗi, phải hiện Toast báo lỗi và chặn UI không cho sinh dữ liệu giả.
