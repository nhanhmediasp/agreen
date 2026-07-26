# BỘ QUY TẮC THIẾT KẾ GIAO DIỆN (UI GUIDELINES) - AGREEN SYSTEM

> **LƯU Ý QUAN TRỌNG:** Đây là "Luật Thiết Kế" duy nhất và bắt buộc áp dụng cho toàn bộ các trang giao diện (Pages & Components) trong dự án AGREEN. Tất cả các lập trình viên và AI agent phải tuân thủ nghiêm ngặt, KHÔNG tự ý sáng tạo layout, màu sắc hoặc tự viết lại component trùng chức năng.

---

## 1. Bảng màu (Color Tokens)

Hệ thống sử dụng Ant Design v5 `ConfigProvider` kết hợp với các CSS Variables trong `src/index.css`. Tất cả các trang phải sử dụng đúng các mã hex và token sau:

| Token Name | Mã Hex | CSS Variable | Mục đích & Quy tắc sử dụng |
| :--- | :--- | :--- | :--- |
| **Primary** | `#006837` | `--primary` | Màu thương hiệu chủ đạo (Nút bấm chính, Active state, Navigation, Accent chính) |
| **Success** | `#047857` | `--status-available-text` | Trạng thái xe **"Sẵn sàng"** (`#ECFDF5` bg, `#10B981` border), Đã thanh toán, Thành công |
| **Warning** | `#C2410C` | `--status-maintenance-text` | Trạng thái xe **"Bảo trì"** (`#FFF7ED` bg, `#F97316` border), Khách **"Cần chú ý"**, Cảnh báo |
| **Danger / Error** | `#EF4444` / `#B91C1C` | `--status-overdue-text` | Trạng thái xe **"Tạm ngưng"**, Hợp đồng **"Quá hạn"**, Chưa thanh toán, Nút Xóa |
| **Info / Processing** | `#1D4ED8` | `--status-rented-text` | Trạng thái xe **"Đang thuê"** (`#EFF6FF` bg, `#3B82F6` border), Đơn **"Đang hoạt động"** |
| **Text Primary** | `#0F172A` | `--text-primary` | Tiêu đề, văn bản chính |
| **Text Secondary** | `#64748B` | `--text-secondary` | Nhãn (labels), mô tả phụ, thông tin ngày tháng |
| **Background Page** | `#F4F6FA` | `--bg-page` | Màu nền của trang web |
| **Background Card** | `#FFFFFF` | `--bg-card` | Nền trắng của Card, Table, Modal |

### Quy tắc Tag màu trạng thái cố định:
- 🟢 **Sẵn sàng / Khách thường**: `<Tag color="success">Sẵn sàng</Tag>`
- 🔵 **Đang thuê / Đang chạy chuyến**: `<Tag color="processing">Đang thuê</Tag>`
- 🟠 **Bảo trì / Khách VIP**: `<Tag color="warning">Bảo trì</Tag>` hoặc `<Tag color="gold">VIP ⭐</Tag>`
- 🔴 **Quá hạn / Tạm ngưng / Khách Cần chú ý**: `<Tag color="error">Quá hạn</Tag>`

---

## 2. Typography & Spacing

### Typography
- **Font-family Sans**: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif` (cho toàn bộ giao diện)
- **Font-family Mono**: `'JetBrains Mono', 'Fira Code', monospace` (bắt buộc cho: **Số tiền ₫**, **Biển số xe**, **Số điện thoại**, **Số KM/ODO**, **Mã đơn/Mã hợp đồng**)
- **Phân cấp Cỡ chữ**:
  - **Page Title (H1)**: `20px` - `22px`, `font-weight: 700`
  - **Section / Card Title (H2)**: `16px` - `17px`, `font-weight: 700`
  - **Statistic Number**: `22px` - `24px`, `font-weight: 700`
  - **Body / Table Content**: `14px`, `font-weight: 400` / `500`
  - **Subtext / Label / Header Bảng**: `12px` - `13px`, `font-weight: 600`

### Radius & Box Shadow
- **Border Radius chuẩn**: `8px` (cho Card, Table container, Modal, Input, Button)
- **Box Shadow chuẩn**: `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` (Card shadow nhẹ nhàng, không gây nhức mắt)

### Spacing (Khoảng cách)
- **Gap giữa các Card trong 1 hàng**: `16px` (`gap: 16px` hoặc `Row/Col gutter={[16, 16]}`)
- **Gap chiều dọc giữa các Section / Khối nội dung**: `22px` - `24px`

---

## 3. Quy tắc chọn Component cho từng loại dữ liệu (BẮT BUỘC)

Nghiêm cấm tự thiết kế HTML/CSS ad-hoc cho các thành phần dữ liệu tiêu chuẩn. Phải dùng đúng component Ant Design v5 sau:

1. **Hiển thị 1 con số thống kê (doanh thu, số lượt thuê, số KM...)**:
   👉 Dùng `antd Statistic` đặt trong `antd Card` (hoặc component `KpiCard`).
   ```tsx
   <Card style={{ borderLeft: '4px solid #047857', borderRadius: 8 }}>
     <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tổng Doanh Thu</div>
     <Statistic value={totalRevenue} suffix="₫" valueStyle={{ fontSize: '22px', fontWeight: 700, color: '#047857' }} />
   </Card>
   ```

2. **Hiển thị nhóm Field-Value (thông số xe, thông tin khách hàng, chi tiết hợp đồng)**:
   👉 Dùng `antd Descriptions` (`bordered`, `column={2}`).
   ```tsx
   <Descriptions bordered column={2} size="small">
     <Descriptions.Item label="Biển số xe"><span className="license-plate">{car.id}</span></Descriptions.Item>
     <Descriptions.Item label="Giá thuê ngày">{car.price.toLocaleString()} ₫/ngày</Descriptions.Item>
   </Descriptions>
   ```

3. **Hiển thị danh sách nhiều dòng có thể Sort / Filter / Pagination**:
   👉 Dùng `antd Table`. Cần định nghĩa `columns` có `sorter`, `filters`, `render` chuẩn.

4. **Hiển thị Trạng thái (Sẵn sàng / Đang thuê / Bảo trì, Phân loại Khách hàng...)**:
   👉 Dùng `antd Tag` kết hợp đúng mã màu ở Mục 1.

5. **Form Nhập liệu / Tạo mới / Chỉnh sửa**:
   👉 Dùng `antd Form` + `Form.Item` với validation `rules`, hiển thị bên trong `antd Modal` (cho form ngắn) hoặc `antd Drawer` (cho form dài).

6. **Nhóm Nút hành động (Sửa / Xóa / Tạo mới / Xuất file)**:
   👉 Dùng `antd Space`, căn phải (`justifyContent: 'flex-end'`).
   - Nút hành động chính: `<Button type="primary">` (màu xanh `#006837`)
   - Nút phụ / Hủy: `<Button type="default">`
   - Nút Xóa: `<Button danger>` hoặc `<Button type="text" danger>`

---

## 4. Component dùng chung bắt buộc tái sử dụng

Trước khi tạo bất kỳ UI mới nào, phải kiểm tra và tái sử dụng các component có sẵn trong `src/components`:

| Component | Đường dẫn File | Mô tả & Cách sử dụng |
| :--- | :--- | :--- |
| **KpiCard** | `src/components/KpiCard.tsx` | Đã tích hợp `antd Card` + `Statistic` + Icon. Dùng cho mọi thẻ chỉ số Dashboard & Báo cáo. |
| **FleetCard** | `src/components/FleetCard.tsx` | Đã tích hợp `antd Tag`. Dùng hiển thị xe dạng Card Grid. |
| **MoneyInput** | `src/components/MoneyInput.tsx` | Input hỗ trợ nhập và format tiền tệ VNĐ chuẩn. |
| **ImageGallery** | `src/components/ImageGallery.tsx` | Modal xem/chọn/upload ảnh cho Xe, Khách hàng, Giấy tờ. |
| **Pagination** | `src/components/Pagination.tsx` | Thanh phân trang tùy chỉnh (cho giao diện ngoài Table). |

---

## 5. Cấu trúc Layout chuẩn của 1 Trang

Mọi trang (Trang Danh sách hoặc Trang Chi tiết) đều phải tuân theo cấu trúc dọc chuẩn gồm 4 tầng:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TẦNG 1: PAGE HEADER (Breadcrumb + Title + Subtitle + Action Buttons)  │
├────────────────────────────────────────────────────────────────────────┤
│ TẦNG 2: KPI / STATISTIC SUMMARY CARDS (Grid 3 - 4 cột, gap: 16px)      │
├────────────────────────────────────────────────────────────────────────┤
│ TẦNG 3: SEARCH & FILTER BAR (Ô tìm kiếm + Bộ lọc nhanh + Filter tags)  │
├────────────────────────────────────────────────────────────────────────┤
│ TẦNG 4: MAIN CONTENT / TABLE (antd Table với sorting & pagination)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Checklist tự kiểm tra trước khi coi 1 trang là "XONG"

Mọi pull request hoặc thay đổi code UI đều phải vượt qua 7 tiêu chí kiểm tra sau:

- [ ] **1. Mã màu chuẩn**: Đã dùng đúng token màu primary (`#006837`), success, warning, danger, info; không tự ý chọn mã màu hex lạ.
- [ ] **2. Component chuẩn AntD**: Đã sử dụng `antd Table`, `Card`, `Statistic`, `Descriptions`, `Tag`, `Modal`/`Drawer`, `Form`; không tự dựng HTML table/modal thủ công.
- [ ] **3. Phông chữ số**: Tất cả các con số (tiền ₫, biển số xe, SĐT, ODO) đã được format `toLocaleString('vi-VN')` và gắn class `font-mono`.
- [ ] **4. Spacing nhất quán**: Gap giữa các card đúng `16px`, gap giữa các phần dọc đúng `22px`-`24px`, border-radius đúng `8px`.
- [ ] **5. Mobile Responsive**: Không bị trượt ngang màn hình (`overflow-x` chuẩn), bảng tự cuộn nội bộ trên điện thoại.
- [ ] **6. Tái sử dụng Component**: Đã dùng các component chung trong `src/components` (`KpiCard`, `FleetCard`, `MoneyInput`...).
- [ ] **7. Build sạch 100%**: Chạy `npm run build` không có bất kỳ lỗi TypeScript hay Vite build warning nào.
