import { csrfHeaders } from '../auth/clientAuth';

export interface UploadedFile {
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface UploadResponse {
  success: boolean;
  data?: UploadedFile;
  error?: string;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders(),
    body: formData,
  });
  const result = await response.json().catch(() => ({
    success: false,
    error: `HTTP ${response.status}`,
  })) as UploadResponse;
  if (!response.ok || !result.success || !result.data) {
    if (response.status === 401) window.dispatchEvent(new Event('agreen:unauthorized'));
    throw new Error(result.error || 'Không thể tải tệp lên máy chủ');
  }
  return result.data;
}

export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
  return Promise.all(files.map(uploadFile));
}
