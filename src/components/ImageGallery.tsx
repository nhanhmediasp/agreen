import { useState, useRef, useEffect } from 'react';
import { Upload, X, Check, Trash2, AlertCircle, FileText, Search } from 'lucide-react';
import { uploadFile } from '../utils/upload';
import { csrfHeaders } from '../auth/clientAuth';

interface ImageGalleryProps {
  onSelect: (imageUrl: string | string[], fileName?: string) => void;
  onClose: () => void;
  multiple?: boolean;
}

export const ImageGallery = ({ onSelect, onClose, multiple = false }: ImageGalleryProps) => {
  const [images, setImages] = useState<{ id: string; url: string; name: string; usedIn: string | null }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [gallerySearchTerm, setGallerySearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load uploaded files from the Express backend API on mount
  useEffect(() => {
    fetch('/api/uploads', { credentials: 'include' })
      .then(res => {
        if (res.status === 401) window.dispatchEvent(new Event('agreen:unauthorized'));
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          throw new Error('API không khả dụng – backend chưa chạy');
        }
        return res.json();
      })
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setImages(res.data);
        }
      })
      .catch(err => {
        console.error('Lỗi khi tải danh sách ảnh từ server:', err);
      });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    e.target.value = '';
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const result = await uploadFile(file);
        return {
          id: result.filename,
          url: result.url,
          name: result.originalName || result.filename,
          usedIn: null,
        };
      }));
      setImages((previous) => [...uploaded, ...previous]);
      setSelectedIds(multiple ? uploaded.map((item) => item.id) : [uploaded[0].id]);
    } catch (error) {
      alert(`Lỗi upload: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
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
    const selectedObjs = images.filter(img => selectedIds.includes(img.id));
    if (multiple) {
      onSelect(selectedObjs.map(img => img.url), selectedObjs[0]?.name);
    } else {
      onSelect(selectedObjs[0].url, selectedObjs[0].name);
    }
    onClose();
  };

  const deleteFromServer = async (imgUrl: string): Promise<boolean> => {
    const filename = imgUrl.split('/').pop();
    if (!filename) return false;
    try {
      const response = await fetch(`/api/uploads/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfHeaders(),
      });
      const result: { success?: boolean; error?: string } = await response.json();
      if (response.status === 401) window.dispatchEvent(new Event('agreen:unauthorized'));
      if (!response.ok || !result.success) throw new Error(result.error || 'Không thể xóa file');
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể xóa file');
      return false;
    }
  };

  const removeImageAndPersist = (id: string) => {
    setImages(prev => prev.filter(i => i.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const handleDeleteAttempt = async (id: string) => {
    const img = images.find(i => i.id === id);
    if (img?.usedIn) {
      setDeleteWarning(img.id);
    } else {
      if (img && img.url.startsWith('/uploads/')) {
        if (!await deleteFromServer(img.url)) return;
      }
      removeImageAndPersist(id);
    }
  };

  const confirmDelete = async (id: string) => {
    const img = images.find(i => i.id === id);
    if (img && img.url.startsWith('/uploads/')) {
      if (!await deleteFromServer(img.url)) return;
    }
    removeImageAndPersist(id);
    setDeleteWarning(null);
  };

  const isPdfUrl = (url: string) => {
    return url.startsWith('data:application/pdf') || url.includes('.pdf') || url.includes('application/pdf');
  };

  const filteredImages = images.filter(img => 
    (img.name || '').toLowerCase().includes(gallerySearchTerm.toLowerCase())
  );

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: '800px', maxWidth: '95vw', height: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>Thư viện tệp & ảnh chung</h2>
            <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
              <X size={24} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#F1F5F9', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <Search size={16} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm ảnh, tệp theo tên..." 
              value={gallerySearchTerm}
              onChange={e => setGallerySearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13.5px' }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
            
            {/* Upload Box */}
            <label 
              style={{ border: '2px dashed var(--primary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px', cursor: 'pointer', background: 'var(--status-ready-bg)' }}
            >
              <Upload size={32} color="var(--primary)" style={{ marginBottom: '8px' }} />
              <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Tải tệp PDF / Ảnh từ máy</span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                multiple={true}
                onChange={handleFileUpload}
                style={{ display: 'none' }} 
              />
            </label>

            {/* Images & PDFs */}
            {filteredImages.map(img => {
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
                      <img src={img.url} alt={img.name || 'Media File'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                        <button style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--status-maintenance)', color: 'white', borderRadius: '4px' }} onClick={(e) => { e.stopPropagation(); confirmDelete(img.id); }}>Xóa luôn</button>
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
            Đã chọn: <strong style={{ color: 'var(--primary)' }}>{selectedIds.length}</strong> ảnh
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Hủy
            </button>
            <button 
              className="btn-primary" 
              onClick={handleConfirm}
              style={{ opacity: selectedIds.length === 0 ? 0.5 : 1, cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              Chèn ảnh đã chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
