/** Lỗi có mã HTTP — throw ở bất kỳ đâu trong route, errorHandler sẽ format lại. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Chưa đăng nhập hoặc phiên đã hết hạn.') => new HttpError(401, msg);
export const forbidden = (msg = 'Không có quyền thực hiện thao tác này.') => new HttpError(403, msg);
export const notFound = (msg = 'Không tìm thấy dữ liệu.') => new HttpError(404, msg);
export const conflict = (msg, details) => new HttpError(409, msg, details);

/** Bọc async handler để lỗi được chuyển sang errorHandler thay vì treo request. */
export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Thông báo tiếng Việt cho các ràng buộc UNIQUE, theo tên constraint của Postgres. */
const UNIQUE_MESSAGES = {
  cars_pkey: 'Biển số xe này đã tồn tại trong hệ thống.',
  owners_phone_key: 'Số điện thoại chủ xe này đã tồn tại.',
  customers_phone_key: 'Số điện thoại khách hàng này đã tồn tại.',
  drivers_phone_key: 'Số điện thoại tài xế này đã tồn tại.',
  users_username_key: 'Tên đăng nhập này đã tồn tại.',
  idx_rentals_one_active_per_car: 'Xe này đã có một đơn thuê đang chạy — không thể tạo thêm đơn đang chạy.',
};

export function errorHandler(err, req, res, _next) {
  switch (err.code) {
    case '23505': // unique_violation
      return res.status(409).json({
        error: UNIQUE_MESSAGES[err.constraint] || 'Dữ liệu đã tồn tại (trùng khoá duy nhất).',
      });
    case '23503': // foreign_key_violation
      return res.status(409).json({
        error: 'Không thể thực hiện vì dữ liệu đang được tham chiếu ở nơi khác.',
      });
    case '23514': // check_violation
      return res.status(400).json({
        error: `Dữ liệu không hợp lệ (vi phạm ràng buộc ${err.constraint || 'kiểm tra'}).`,
      });
    case '22P02': // invalid_text_representation
      return res.status(400).json({ error: 'Định dạng dữ liệu gửi lên không hợp lệ.' });
    case '42P01': // undefined_table
      console.error('[db]', err.message);
      return res.status(503).json({
        error: 'Cơ sở dữ liệu chưa được khởi tạo. Hãy chạy: npm run db:migrate',
      });
    case 'ECONNREFUSED':
    case '28P01': // invalid_password
    case '3D000': // invalid_catalog_name
      console.error('[db]', err.message);
      return res.status(503).json({
        error: 'Không kết nối được cơ sở dữ liệu. Kiểm tra cấu hình .env và dịch vụ PostgreSQL.',
      });
    default:
      break;
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err?.type === 'entity.too.large' || err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Tệp/dữ liệu gửi lên quá lớn.' });
  }

  console.error('[server]', err);
  return res.status(500).json({ error: 'Lỗi hệ thống, vui lòng thử lại.' });
}
