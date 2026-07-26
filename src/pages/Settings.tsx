import { useState, useEffect, useRef } from 'react';
import { Upload, Save, RefreshCw, Eye, ShieldCheck, ShieldAlert, Lock, Trash2, Key, CheckCircle2, Download, Database, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSecurityLogs, clearSecurityLogs, type SecurityLog } from './Login';
import { ImageGallery } from '../components/ImageGallery';

const DEFAULT_CONTRACT_TEMPLATE = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

HỢP ĐỒNG CHO THUÊ XE TỰ LÁI

Bên A (Bên cho thuê): AutoManage Car Rental
Bên B (Bên thuê): {ten_khach_hang}
Số điện thoại: {so_dien_thoai}

ĐIỀU 1: NỘI DUNG HỢP ĐỒNG
Bên A đồng ý cho Bên B thuê xe ô tô tự lái có thông tin như sau:
- Dòng xe: {dong_xe}
- Biển số xe: {bien_so_xe}
- Thời gian thuê: Từ {ngay_thue} đến {ngay_tra}

ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG & ĐẶT CỌC
- Tổng tiền thuê: {tong_tien_thue} VNĐ
- Số tiền đặt cọc giữ xe: {tien_dat_coc} VNĐ (Bên A sẽ hoàn trả đầy đủ cho Bên B sau khi nhận lại xe nguyên vẹn).

ĐIỀU 3: QUY ĐỊNH SỬ DỤNG
1. Bên B cam kết sử dụng xe đúng mục đích, không chở hàng cấm, không lái xe khi say rượu bia.
2. Trả xe đúng giờ đã hẹn. Nếu quá giờ phạt 100.000 VNĐ/giờ.`;

const SettingsPage = () => {
  const {
    settings, updateSettings, rollbackLogo, load500DemoData, resetDemoData,
    showToast, exportBackup, importBackup,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'interface' | 'contract' | 'security'>('interface');

  // Local state for settings preview before saving
  const [localColor, setLocalColor] = useState(settings.primaryColor);
  const [localLogo, setLocalLogo] = useState(settings.logo);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [showLogoGallery, setShowLogoGallery] = useState(false);
  const [busy, setBusy] = useState(false);

  // Security State — nhật ký giờ nằm ở server, không còn trong localStorage
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);

  // Mẫu hợp đồng: nạp từ server và LƯU ĐƯỢC (trước đây chỉ là state tạm rồi mất)
  const [contractTerms, setContractTerms] = useState(settings.contractTerms || DEFAULT_CONTRACT_TEMPLATE);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ lại form khi settings từ server về / thay đổi
  useEffect(() => {
    setLocalColor(settings.primaryColor);
    setLocalLogo(settings.logo);
    setContractTerms(settings.contractTerms || DEFAULT_CONTRACT_TEMPLATE);
  }, [settings.primaryColor, settings.logo, settings.contractTerms]);

  useEffect(() => {
    getSecurityLogs().then(setSecurityLogs).catch(() => setSecurityLogs([]));
  }, []);

  const colors = [
    { name: 'Xanh Lá Vận Tải', hex: '#006837' },
    { name: 'Xanh Dương Đậm', hex: '#1E3A8A' },
    { name: 'Đen Thạch Anh', hex: '#1A231E' },
    { name: 'Đỏ Huyết Dụ', hex: '#831843' },
    { name: 'Hổ Phách Sậm', hex: '#B45309' }
  ];

  const handleSave = async () => {
    setBusy(true);
    const ok = await updateSettings({ primaryColor: localColor, logo: localLogo });
    setBusy(false);
    if (!ok) return;
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 3000);
  };

  const handleSaveContract = async () => {
    setBusy(true);
    const ok = await updateSettings({ contractTerms });
    setBusy(false);
    if (ok) showToast('Đã lưu mẫu hợp đồng vào hệ thống!', 'success');
  };

  /** Hoàn tác logo — state cục bộ được đồng bộ qua useEffect nên không cần setTimeout đoán mò. */
  const handleResetLogo = async () => {
    setBusy(true);
    const ok = await rollbackLogo();
    setBusy(false);
    if (ok) showToast('Đã hoàn tác về logo trước đó!', 'info');
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tất cả lịch sử nhật ký bảo mật?')) return;
    try {
      await clearSecurityLogs();
      setSecurityLogs([]);
      showToast('Đã xóa nhật ký bảo mật!', 'info');
    } catch {
      showToast('Không xóa được nhật ký bảo mật.', 'error');
    }
  };

  const handleDemoData = async () => {
    if (!window.confirm('Thao tác này sẽ XOÁ toàn bộ dữ liệu hiện tại và thay bằng dữ liệu mẫu. Tiếp tục?')) return;
    setBusy(true);
    await load500DemoData();
    setBusy(false);
  };

  const handleResetData = async () => {
    if (!window.confirm('Thao tác này sẽ XOÁ toàn bộ dữ liệu hiện tại và nạp lại bộ khởi tạo. Tiếp tục?')) return;
    setBusy(true);
    await resetDemoData();
    setBusy(false);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm(`Khôi phục từ "${file.name}" sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại. Tiếp tục?`)) return;
    setBusy(true);
    await importBackup(file);
    setBusy(false);
  };

  const handleInsertTag = (tag: string) => {
    setContractTerms(prev => prev + ` ${tag}`);
  };

  /** Logo có thể là URL ngoài, tệp đã upload (/uploads/...) hoặc chỉ là chữ viết tắt. */
  const isLogoImage = localLogo.startsWith('http') || localLogo.startsWith('data:') || localLogo.startsWith('/uploads/');

  const renderPreviewContract = () => {
    return contractTerms
      .replace(/{ten_khach_hang}/g, 'Nguyễn Văn A')
      .replace(/{so_dien_thoai}/g, '0901234567')
      .replace(/{dong_xe}/g, 'Mazda 3 2022')
      .replace(/{bien_so_xe}/g, '51F-123.45')
      .replace(/{ngay_thue}/g, '15/07/2026 08:00')
      .replace(/{ngay_tra}/g, '17/07/2026 17:00')
      .replace(/{tong_tien_thue}/g, '1,750,000')
      .replace(/{tien_dat_coc}/g, '10,000,000');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1300px', width: '100%', position: 'relative' }}>
      
      {showSavedNotification && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', background: 'var(--status-ready-text)', color: 'white', padding: '16px 24px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 1000, fontWeight: 600 }}>
          Cấu hình hệ thống đã được cập nhật thành công!
        </div>
      )}

      <div>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Cài đặt hệ thống</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Tùy chỉnh giao diện, mẫu hợp đồng và trung tâm bảo mật website</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border-light)' }}>
        <button 
          onClick={() => setActiveTab('interface')}
          style={{ padding: '12px 16px', borderBottom: activeTab === 'interface' ? '2px solid var(--primary)' : 'none', color: activeTab === 'interface' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
        >
          Giao diện hệ thống
        </button>
        <button 
          onClick={() => setActiveTab('contract')}
          style={{ padding: '12px 16px', borderBottom: activeTab === 'contract' ? '2px solid var(--primary)' : 'none', color: activeTab === 'contract' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600 }}
        >
          Mẫu hợp đồng
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          style={{ padding: '12px 16px', borderBottom: activeTab === 'security' ? '2px solid var(--primary)' : 'none', color: activeTab === 'security' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ShieldCheck size={17} style={{ color: activeTab === 'security' ? '#006837' : 'inherit' }} />
          Bảo mật & Anti-Spam
        </button>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* TAB 1: GIAO DIỆN */}
        {activeTab === 'interface' && (
          <>
            {/* LOGO */}
            <div>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Logo Thương hiệu</h2>
              <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
                <div style={{ width: '160px', height: '160px', backgroundColor: 'var(--bg-main)', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {isLogoImage ? (
                    <img src={localLogo} alt="Preview Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: localColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '32px' }}>
                      {localLogo}
                    </div>
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontWeight: 500, marginBottom: '4px' }}>Logo hiện tại</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Kích thước đề xuất: 512×512px.<br/>Định dạng PNG nền trong suốt, tối đa 2MB.
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" style={{ gap: '8px' }} onClick={() => setShowLogoGallery(true)}>
                      <Upload size={16} />
                      Tải logo mới
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ gap: '8px' }}
                      onClick={handleResetLogo}
                      disabled={busy || settings.logoHistory.length <= 1}
                      title={settings.logoHistory.length <= 1 ? 'Chưa có logo cũ để hoàn tác' : undefined}
                    >
                      <RefreshCw size={16} />
                      Hoàn tác logo cũ
                    </button>
                    <button className="btn-ghost" style={{ gap: '8px' }} onClick={() => setLocalLogo('Auto')}>
                      <ImageIcon size={16} />
                      Dùng chữ viết tắt
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-light)' }}></div>

            {/* PRIMARY COLOR */}
            <div>
              <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Màu chủ đạo (Theme Primary)</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                Chọn bảng màu đại diện thương hiệu cho các nút bấm, thanh điều hướng và biểu tượng chính.
              </p>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {colors.map((c) => (
                  <div 
                    key={c.hex}
                    onClick={() => setLocalColor(c.hex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: localColor === c.hex ? `2px solid ${c.hex}` : '1px solid var(--border-light)',
                      backgroundColor: localColor === c.hex ? 'var(--bg-main)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: c.hex }}></div>
                    <span style={{ fontSize: '14px', fontWeight: localColor === c.hex ? 600 : 400 }}>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-light)' }}></div>

            {/* BACKUP & RESTORE */}
            <div>
              <h2 style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="var(--primary)" /> Sao lưu &amp; Khôi phục dữ liệu
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                Xuất toàn bộ dữ liệu trong PostgreSQL ra một tệp JSON để lưu trữ, hoặc nạp lại từ tệp đã sao lưu.
                Nên tải bản sao lưu trước mỗi lần cập nhật hệ thống.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn-secondary" style={{ gap: '8px' }} onClick={() => void exportBackup()} disabled={busy}>
                  <Download size={16} /> Tải xuống bản sao lưu (.json)
                </button>
                <button className="btn-ghost" style={{ gap: '8px' }} onClick={() => restoreInputRef.current?.click()} disabled={busy}>
                  <Upload size={16} /> Khôi phục từ tệp sao lưu
                </button>
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleRestoreFile}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-light)' }}></div>

            {/* DEMO DATA LOADER */}
            <div>
              <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Dữ liệu mẫu (Stress-Test Performance)</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                Nạp 50 xe, 500 hợp đồng và 80 khách hàng để thử nghiệm khả năng chịu tải và tốc độ xử lý của bảng.
                <strong style={{ color: 'var(--status-maintenance-text)' }}> Lưu ý: thao tác này xoá sạch dữ liệu hiện có.</strong>
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn-secondary" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={handleDemoData} disabled={busy}>
                  ⚡ Nạp dữ liệu mẫu lớn
                </button>
                <button className="btn-ghost" style={{ color: 'var(--status-maintenance-text)' }} onClick={handleResetData} disabled={busy}>
                  🧹 Đặt lại dữ liệu ban đầu
                </button>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-light)' }}></div>

            {/* SAVE ACTION */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" style={{ gap: '8px' }} onClick={handleSave} disabled={busy}>
                <Save size={16} />
                {busy ? 'Đang lưu...' : 'Lưu cấu hình giao diện'}
              </button>
            </div>
          </>
        )}

        {/* TAB 2: MẪU HỢP ĐỒNG */}
        {activeTab === 'contract' && (
          <>
            <div>
              <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Mẫu hợp đồng thuê xe chuẩn</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                Nhập văn bản điều khoản và gán các biến thông minh. Các biến trong ngoặc nhọn <code>{'{...}'}</code> sẽ tự động điền thông tin thực tế khi xuất in PDF.
              </p>

              {/* Tag Generator Controls */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', alignSelf: 'center' }}>Chèn nhanh biến:</span>
                {[
                  { label: '+ Tên khách', tag: '{ten_khach_hang}' },
                  { label: '+ SĐT', tag: '{so_dien_thoai}' },
                  { label: '+ Biển số', tag: '{bien_so_xe}' },
                  { label: '+ Dòng xe', tag: '{dong_xe}' },
                  { label: '+ Ngày thuê', tag: '{ngay_thue}' },
                  { label: '+ Ngày trả', tag: '{ngay_tra}' },
                  { label: '+ Tổng tiền', tag: '{tong_tien_thue}' },
                  { label: '+ Tiền cọc', tag: '{tien_dat_coc}' }
                ].map(t => (
                  <button key={t.tag} onClick={() => handleInsertTag(t.tag)} className="btn-ghost" style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid var(--border-light)' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Textarea Editor */}
              <textarea 
                value={contractTerms}
                onChange={e => setContractTerms(e.target.value)}
                rows={16}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontFamily: 'monospace',
                  fontSize: '13.5px',
                  lineHeight: '1.6',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-main)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn-secondary" style={{ gap: '8px' }} onClick={() => setShowPreviewModal(true)}>
                <Eye size={16} />
                Xem trước bản in PDF
              </button>
              
              <button className="btn-primary" style={{ gap: '8px' }} onClick={handleSaveContract} disabled={busy}>
                <Save size={16} />
                {busy ? 'Đang lưu...' : 'Lưu mẫu hợp đồng'}
              </button>
            </div>
          </>
        )}

        {/* TAB 3: BẢO MẬT & ANTI-SPAM */}
        {activeTab === 'security' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#ECFDF5', padding: '10px', borderRadius: '12px', color: '#006837' }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', margin: 0, color: '#0F172A' }}>Trung Tâm Bảo Mật & Anti-Spam Website</h2>
                <p style={{ margin: '2px 0 0', fontSize: '13.5px', color: '#64748B' }}>Chống tấn công Brute-Force dò mật khẩu, bot cào dữ liệu và quản lý phiên làm việc</p>
              </div>
            </div>

            {/* Active Security Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              
              {/* Brute force lockout */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <Lock size={16} style={{ color: '#006837', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap' }}>Chống Brute-Force</span>
                  </span>
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    KÍCH HOẠT
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Server tự khóa đăng nhập theo IP <strong>5 phút</strong> nếu nhập sai mật khẩu 5 lần liên tiếp. Xoá localStorage không bỏ qua được.
                </p>
              </div>

              {/* Math CAPTCHA */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <ShieldAlert size={16} style={{ color: '#2563EB', flexShrink: 0 }} />
                    <span>Mã CAPTCHA Chống Bot</span>
                  </span>
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    KÍCH HOẠT
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Bắt buộc giải mã toán học khi sai mật khẩu từ lần thứ 3 để chặn bot tự động.
                </p>
              </div>

              {/* Data Scraping Guard */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <Key size={16} style={{ color: '#7C3AED', flexShrink: 0 }} />
                    <span>Chống Cào Dữ Liệu</span>
                  </span>
                  <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    KÍCH HOẠT
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  Giới hạn tần suất truy vấn liên tục, bảo vệ thông tin khách hàng & xe khỏi bị moi data.
                </p>
              </div>

            </div>

            {/* Audit Logs Table */}
            <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                  📋 Lịch Sử Nhật Ký Bảo Mật & Cảnh Báo Hệ Thống
                </div>
                {securityLogs.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Trash2 size={13} /> Xóa nhật ký
                  </button>
                )}
              </div>

              {securityLogs.length === 0 ? (
                <div style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                  <CheckCircle2 size={36} style={{ color: '#10B981', opacity: 0.5, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Chưa phát hiện sự cố bảo mật nào. Hệ thống an toàn!</p>
                </div>
              ) : (
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F1F5F9', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 14px' }}>Thời Gian</th>
                        <th style={{ padding: '10px 14px' }}>Loại Sự Cố</th>
                        <th style={{ padding: '10px 14px' }}>Tài Khoản</th>
                        <th style={{ padding: '10px 14px' }}>Nội Dung Chi Tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityLogs.map(log => {
                        const badges = {
                          LOGIN_SUCCESS: { bg: '#DCFCE7', color: '#15803D', text: '✅ Đăng nhập thành công' },
                          LOGIN_FAILED: { bg: '#FEE2E2', color: '#991B1B', text: '⚠️ Đăng nhập sai' },
                          LOCKOUT: { bg: '#FEF3C7', color: '#B45309', text: '🔒 Khóa Brute-force' },
                          PASSWORD_CHANGE: { bg: '#DBEAFE', color: '#1E40AF', text: '🔑 Đổi mật khẩu' }
                        };
                        const badgeInfo = badges[log.type] || badges.LOGIN_SUCCESS;

                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 14px', color: '#64748B', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: badgeInfo.bg, color: badgeInfo.color }}>
                                {badgeInfo.text}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0F172A' }}>{log.username}</td>
                            <td style={{ padding: '10px 14px', color: '#334155' }}>{log.message}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Contract PDF Preview Modal */}
      {showPreviewModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '700px', height: '85vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Xem trước Bản in hợp đồng (PDF giả lập)</h2>
              <button onClick={() => setShowPreviewModal(false)} style={{ fontSize: '20px', fontWeight: 'bold' }}>×</button>
            </div>
            
            <div style={{ flex: 1, padding: '32px', overflowY: 'auto', backgroundColor: '#525659', display: 'flex', justifyContent: 'center' }}>
              {/* PDF Sheet simulation */}
              <div style={{ width: '100%', maxWidth: '595px', minHeight: '842px', padding: '48px', background: 'white', color: '#000', fontSize: '14px', fontFamily: 'serif', lineHeight: '1.6', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', position: 'relative' }}>
                {/* Header branding */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isLogoImage ? (
                      <img src={localLogo} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ padding: '6px 12px', background: localColor, color: 'white', fontWeight: 'bold', fontSize: '16px' }}>{localLogo}</div>
                    )}
                    <span style={{ fontWeight: 'bold', fontSize: '14px', fontFamily: 'var(--font-heading)' }}>AutoManage Car Rental</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#555' }}>
                    Mẫu số: 01/HD-AUTO<br/>Liên hệ: 1900 1234
                  </div>
                </div>

                {/* Main Text with variables populated */}
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif', fontSize: '13px', margin: 0 }}>
                  {renderPreviewContract()}
                </pre>

                {/* Footer signatures */}
                <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'space-between', padding: '0 24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <strong>Đại diện Bên A</strong><br/>
                    <span style={{ fontSize: '11px', color: '#777' }}>(Ký, đóng dấu)</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <strong>Đại diện Bên B</strong><br/>
                    <span style={{ fontSize: '11px', color: '#777' }}>(Ký, ghi rõ họ tên)</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--bg-main)' }}>
              <button className="btn-primary" onClick={() => window.print()}>
                In hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chọn/Tải logo từ thư viện chung */}
      {showLogoGallery && (
        <ImageGallery
          onClose={() => setShowLogoGallery(false)}
          onSelect={(url) => {
            setLocalLogo(Array.isArray(url) ? url[0] : url);
            setShowLogoGallery(false);
          }}
        />
      )}

    </div>
  );
};

export default SettingsPage;
