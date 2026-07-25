import { useState, useRef, useEffect } from 'react';
import { Upload, X, Check, Trash2, AlertCircle, FileText } from 'lucide-react';

interface ImageGalleryProps {
  onSelect: (imageUrl: string | string[], fileName?: string) => void;
  onClose: () => void;
  multiple?: boolean;
}

export const ImageGallery = ({ onSelect, onClose, multiple = false }: ImageGalleryProps) => {
  const [images, setImages] = useState<{ id: string; url: string; name: string; usedIn: string | null }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [apiAvailable, setApiAvailable] = useState(true);

  // Load uploaded files – try API first, fallback to localStorage
  useEffect(() => {
    fetch('/api/uploads')
      .then(res => {
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('not json');
        return res.json();
      })
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setImages(res.data);
          setApiAvailable(true);
        }
      })
      .catch(() => {
        setApiAvailable(false);
        // Load from localStorage fallback
        try {
          const saved = localStorage.getItem('agreen_gallery_images');
          if (saved) setImages(JSON.parse(saved));
        } catch { /* ignore */ }
      });
  }, []);

  // Persist to localStorage whenever images change (for offline/fallback mode)
  useEffect(() => {
    if (!apiAvailable && images.length > 0) {
      localStorage.setItem('agreen_gallery_images', JSON.stringify(images));
    }
  }, [images, apiAvailable]);

  // Helper: read file as base64 Data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    files.forEach(async (file) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);

      // Always try API upload first
      if (apiAvailable) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const json = await res.json();
            if (json.success && json.data) {
              const newItem = { id, url: json.data.url, name: json.data.filename || file.name, usedIn: null };
              setImages(prev => [newItem, ...prev]);
              if (!multiple) { setSelectedIds([id]); } else { setSelectedIds(prev => [id, ...prev]); }
              return; // success – done
            }
          }
          // If we reach here, the API returned non-JSON (HTML fallback page)
          setApiAvailable(false);
        } catch {
          setApiAvailable(false);
        }
      }

      // Fallback: read as base64 Data URL (works without backend)
      try {
        const dataUrl = await readFileAsDataURL(file);
        const newItem = { id, url: dataUrl, name: file.name, usedIn: null };
        setImages(prev => {
          const next = [newItem, ...prev];
          localStorage.setItem('agreen_gallery_images', JSON.stringify(next));
          return next;
        });
        if (!multiple) { setSelectedIds([id]); } else { setSelectedIds(prev => [id, ...prev]); }
      } catch (readErr) {
        alert(`Không thể đọc file: ${readErr instanceof Error ? readErr.message : readErr}`);
      }
    });
    e.target.value = '';
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

  const deleteFromServer = (imgUrl: string) => {
    if (!apiAvailable) return;
    const filename = imgUrl.split('/').pop();
    if (!filename) return;
    fetch(`/api/uploads/${filename}`, { method: 'DELETE' })
      .then(res => {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) return res.json();
        return { success: false };
      })
      .then(res => {
        if (!res.success) {
          console.error('Không thể xóa file trên server:', res.error);
        }
      })
      .catch(err => {
        console.error('Lỗi mạng khi xóa file:', err);
      });
  };

  const removeImageAndPersist = (id: string) => {
    setImages(prev => {
      const next = prev.filter(i => i.id !== id);
      if (!apiAvailable) {
        localStorage.setItem('agreen_gallery_images', JSON.stringify(next));
      }
      return next;
    });
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const handleDeleteAttempt = (id: string) => {
    const img = images.find(i => i.id === id);
    if (img?.usedIn) {
      setDeleteWarning(img.id);
    } else {
      if (img && img.url.startsWith('/uploads/')) {
        deleteFromServer(img.url);
      }
      removeImageAndPersist(id);
    }
  };

  const confirmDelete = (id: string) => {
    const img = images.find(i => i.id === id);
    if (img && img.url.startsWith('/uploads/')) {
      deleteFromServer(img.url);
    }
    removeImageAndPersist(id);
    setDeleteWarning(null);
  };

  const isPdfUrl = (url: string) => {
    return url.startsWith('data:application/pdf') || url.includes('.pdf') || url.includes('application/pdf');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: '800px', maxWidth: '95vw', height: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Thư viện tệp & ảnh chung</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
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
                accept="image/*,application/pdf" 
                multiple={multiple}
                onChange={handleFileUpload}
                style={{ display: 'none' }} 
              />
            </label>

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
