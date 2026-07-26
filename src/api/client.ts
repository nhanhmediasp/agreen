/**
 * Lớp gọi API duy nhất của frontend.
 *
 * - Cùng origin với web (nginx proxy /api -> Node), nên cookie phiên đi kèm tự động.
 * - Token phiên nằm trong cookie httpOnly => JavaScript không đọc được,
 *   XSS không thể đánh cắp phiên đăng nhập.
 */

const BASE = '/api';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** Được gọi khi server trả 401 — để App đưa người dùng về trang đăng nhập. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  /** true = không tự chuyển về trang login khi gặp 401 (dùng cho /auth/me, /auth/login) */
  silent401?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, silent401 = false } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers: body instanceof FormData || body === undefined
        ? undefined
        : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được tới server. Kiểm tra kết nối mạng hoặc dịch vụ API.');
  }

  if (response.status === 401 && !silent401) {
    onUnauthorized?.();
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message = (isJson && payload && typeof payload === 'object' && 'error' in payload)
      ? String((payload as { error: unknown }).error)
      : `Lỗi ${response.status}`;
    throw new ApiError(response.status, message, (payload as { details?: unknown })?.details);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),

  /** Upload tệp thật lên server thay vì nhồi base64 vào localStorage. */
  upload: async <T>(path: string, files: File[]): Promise<T> => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return request<T>(path, { method: 'POST', body: form });
  },
};
