export type ChangeKind = 'new' | 'improved' | 'fixed' | 'security';

export type ChangelogEntry = {
  version: string;
  releasedAt: string;
  title: string;
  summary: string;
  changes: Array<{
    kind: ChangeKind;
    text: string;
  }>;
};

// Mỗi lần phát hành code mới, thêm phiên bản mới lên đầu danh sách này.
// Trang Cài đặt sẽ tự lấy phần tử đầu tiên làm phiên bản hiện tại.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.7.0',
    releasedAt: '2026-09-06',
    title: 'Tạo đơn và quản lý chủ xe ổn định hơn',
    summary: 'Chuẩn hóa dữ liệu tài khoản, khách hàng và chủ xe; đồng thời hoàn thiện luồng tạo đơn và chi trả chủ xe.',
    changes: [
      { kind: 'fixed', text: 'Chặn tạo trùng chủ xe và khách hàng theo số điện thoại, CCCD hoặc email đã chuẩn hóa.' },
      { kind: 'fixed', text: 'Chặn tên đăng nhập trùng không phân biệt chữ hoa/thường và chỉ cho phép đổi thông tin tài khoản đang đăng nhập.' },
      { kind: 'fixed', text: 'Tạo khách hàng mới cùng đơn thuê trong một giao dịch; đơn lỗi sẽ không để lại khách hàng rác.' },
      { kind: 'fixed', text: 'Tạo chủ xe mới cùng xe trong một giao dịch tại màn hình tạo đơn và quản lý đội xe.' },
      { kind: 'fixed', text: 'Admin có thể nhập thủ công tiền chi trả chủ xe; số tiền được giữ nguyên khi cập nhật, trả xe và lập báo cáo.' },
      { kind: 'fixed', text: 'Mở lại tùy chọn áp dụng phụ phí cuối tuần/lễ tết và giới hạn tỷ lệ nhập từ 0 đến 100%.' },
      { kind: 'improved', text: 'Bổ sung đầy đủ email, CCCD và thông tin ngân hàng trong hồ sơ chủ xe.' },
      { kind: 'improved', text: 'Chuẩn hóa tạo payout theo hợp đồng đủ điều kiện, tránh lập phiếu chi lặp cho cùng đơn thuê.' },
    ],
  },
  {
    version: '2.6.0',
    releasedAt: '2026-08-24',
    title: 'Báo cáo tài chính và trải nghiệm hệ thống',
    summary: 'Hoàn thiện báo cáo doanh thu, chi phí, lợi nhuận và nâng độ ổn định của các thao tác vận hành.',
    changes: [
      { kind: 'new', text: 'Làm mới trang Báo cáo & Thống kê với bộ lọc thời gian, biểu đồ tài chính và dòng tiền.' },
      { kind: 'improved', text: 'Tổng chi phí bao gồm chi phí vận hành, chiết khấu chủ xe và hoa hồng tài xế.' },
      { kind: 'improved', text: 'Bảng Hiệu quả theo xe hiển thị 10 xe mỗi trang và có điều hướng phân trang.' },
      { kind: 'improved', text: 'Lợi nhuận cửa hàng được làm nổi bật và tách rõ khỏi dòng tiền thực tế.' },
      { kind: 'fixed', text: 'Sửa truy vấn biểu đồ tài chính bị lỗi UNION và tăng tương thích với dữ liệu cũ.' },
      { kind: 'fixed', text: 'Sửa nút Ghi nhận trong form thêm chi phí và ngăn gửi trùng giao dịch.' },
      { kind: 'new', text: 'Bổ sung trang 404 cho các đường dẫn không tồn tại.' },
      { kind: 'security', text: 'Các thay đổi báo cáo chỉ đọc dữ liệu, không xóa hoặc ghi đè bản ghi tài chính cũ.' },
    ],
  },
  {
    version: '2.5.0',
    releasedAt: '2026-07-28',
    title: 'Nền tảng vận hành và sổ tài chính',
    summary: 'Chuẩn hóa quy trình thuê xe, dịch vụ tài xế, tiền cọc và bảo mật quản trị.',
    changes: [
      { kind: 'new', text: 'Bổ sung sổ thanh toán đơn thuê, đơn dịch vụ và quy trình payout chủ xe.' },
      { kind: 'improved', text: 'Đồng bộ trạng thái xe theo vòng đời đơn thuê và tăng kiểm tra trùng lịch.' },
      { kind: 'improved', text: 'Quản lý tiền cọc tiền mặt, tài sản cọc và lịch sử hoàn cọc.' },
      { kind: 'security', text: 'Tăng cường xác thực, phân quyền, CSRF, kiểm tra tệp tải lên và migration an toàn.' },
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;
