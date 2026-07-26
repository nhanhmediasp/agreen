import { useState, useRef } from 'react';
import { Upload, X, Check, Trash2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface ImageGalleryProps {
  onSelect: (imageUrl: string | string[], fileName?: string) => void;
  onClose: () => void;
  multiple?: boolean;
}

/**
 * Thư viện tệp & ảnh DÙNG CHUNG.
 *
 * Bản cũ giữ một mảng DUMMY_IMAGES cứng trong state cục bộ: ảnh vừa tải lên
 * biến mất ngay khi đóng modal, và ảnh thêm ở nơi khác không bao giờ xuất hiện.
 * Giờ mọi thứ đọc/ghi qua AppContext -> server -> PostgreSQL, file thật nằm
 * trong server/uploads/ nên không còn nhồi base64 làm tràn localStorage.
 */
export const ImageGallery = ({ onSelect, onClose, multiple = false }: ImageGalleryProps) => {
  const { images, uploadImages, deleteImage } = useApp();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Reset ngay để chọn lại đúng tệp đó lần nữa vẫn kích hoạt onChange
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    try {
      const created = await uploadImages(files);
      if (created.length > 0) {
        const newIds = created.map((img) => img.id);
        setSelectedIds(multiple ? (prev) => [...newIds, ...prev] : [newIds[0]]);
      }
    } finally {
      setUploading(false);
    }
  };

  const toggleSelect = (id: string) => {
    if (multiple) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
    }
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) return;
    // Giữ đúng thứ tự người dùng đã chọn
    const selectedObjs = selectedIds
      .map((id) => images.find((img) => img.id === id))
      .filter((img): img is NonNullable<typeof img> => Boolean(img));
    if (selectedObjs.length === 0) return;

    if (multiple) {
      onSelect(selectedObjs.map(img => img.url), selectedObjs[0]?.name);
    } else {
      onSelect(selectedObjs[0].url, selectedObjs[0].name);
    }
    onClose();
  };

  const handleDeleteAttempt = (id: string) => {
    const img = images.find(i => i.id === id);
    if (img?.usedIn) {
      setDeleteWarning(img.id);
    } else {
      void confirmDelete(id);
    }
  };

  const confirmDelete = async (id: string) => {
    setDeleteWarning(null);
    const ok = await deleteImage(id);
    if (ok) setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const isPdfUrl = (url: string, mime?: string) =>
    mime === 'application/pdf' || url.startsWith('data:application/pdf') || url.toLowerCase().endsWith('.pdf');

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: '800px', maxWidth: '95vw', height: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Thư viện tệp &amp; ảnh chung</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }} aria-label="Đóng">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>

            {/* Upload Box */}
            <label
              style={{ border: '2px dashed var(--primary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', cursor: uploading ? 'wait' : 'pointer', background: 'var(--status-ready-bg)' }}
            >
              {uploading ? (
                <>
                  <Loader2 size={30} color="var(--primary)" style={{ marginBottom: '8px', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '13px' }}>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Upload size={32} color="var(--primary)" style={{ marginBottom: '8px' }} />
                  <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Tải tệp PDF / Ảnh từ máy</span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple={multiple}
                disabled={uploading}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>

            {images.length === 0 && !uploading && (
              <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Thư viện đang trống. Hãy tải ảnh hoặc tệp hợp đồng đầu tiên lên.
              </div>
            )}

            {/* Images & PDFs */}
            {images.map(img => {
              const isSelected = selectedIds.includes(img.id);
              const isPdf = isPdfUrl(img.url);
              return (
                <div
                  key={img.id}
                  style={{ position: 'relative', height: '160px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: isSelected ? '3px solid var(--primary)' : '1px solid var(--border-light)', background: isPdf ? '#f8fafc' : 'transparent', cursor: 'pointer' }}
                  onClick={() => toggleSelect(img.id)}
                >
                  {isPdf ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', gap: '8px' }}>
                      <FileText size={44} color="#dc2626" />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', textAlign: 'center', wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {img.name || 'Tệp_Hop_Dong.pdf'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <img src={img.url} alt={img.name || 'Media File'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {img.name && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px', padding: '2px 6px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 4 }}>
                          {img.name}
                        </div>
                      )}
                    </>
                  )}

                  {isSelected && (
                    <div style={{ position: 'absolute', top: '8px', left: '8px', width: '24px', height: '24px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 5 }}>
                      <Check size={16} />
                    </div>
                  )}

                  <button
                    aria-label="Xoá tệp"
                    style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-maintenance)', zIndex: 5 }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteAttempt(img.id); }}
                  >
                    <Trash2 size={16} />
                  </button>

                  {img.usedIn && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '11px', padding: '4px', textAlign: 'center', zIndex: 5 }}>
                      Đang dùng: {img.usedIn}
                    </div>
                  )}

                  {deleteWarning === img.id && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.95)', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', zIndex: 10 }}>
                      <AlertCircle size={24} color="var(--status-maintenance)" style={{ marginBottom: '8px' }} />
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                        Tệp này đang dùng ở {img.usedIn}. Bạn vẫn muốn xóa?
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--border-light)', borderRadius: '4px' }} onClick={(e) => { e.stopPropagation(); setDeleteWarning(null); }}>Hủy</button>
                        <button style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--status-maintenance)', color: 'white', borderRadius: '4px' }} onClick={(e) => { e.stopPropagation(); void confirmDelete(img.id); }}>Xóa luôn</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Đã chọn: <strong style={{ color: 'var(--primary)' }}>{selectedIds.length}</strong> tệp
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Hủy
            </button>
            <button
              className="btn-primary"
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              style={{ opacity: selectedIds.length === 0 ? 0.5 : 1, cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              Chèn tệp đã chọn
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
