import { useState } from 'react';
import { Upload, Save, RefreshCw, ShieldCheck, ShieldAlert, Lock, Trash2, Key, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSecurityLogs, clearSecurityLogs, type SecurityLog } from './Login';

const SettingsPage = () => {
  const { settings, updateSettings, rollbackLogo, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'interface' | 'contract' | 'security'>('interface');
  
  // Local state for settings preview before saving
  const [localColor, setLocalColor] = useState(settings.primaryColor);
  const [localLogo, setLocalLogo] = useState(settings.logo);
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Security State
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>(() => getSecurityLogs());

  const colors = [
    { name: 'Xanh Lá Vận Tải', hex: '#006837' },
    { name: 'Xanh Dương Đậm', hex: '#1E3A8A' },
    { name: 'Đen Thạch Anh', hex: '#1A231E' },
    { name: 'Đỏ Huyết Dụ', hex: '#831843' },
    { name: 'Hổ Phách Sậm', hex: '#B45309' }
  ];

  const handleSave = () => {
    updateSettings({
      primaryColor: localColor,
      logo: localLogo
    });
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
    }, 3000);
  };

  const handleLogoChange = () => {
    const newMockLogo = 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=128&q=80';
    setLocalLogo(newMockLogo);
  };

  const handleResetLogo = () => {
    rollbackLogo();
    setTimeout(() => {
      setLocalLogo(settings.logoHistory[settings.logoHistory.length - 2] || 'Auto');
    }, 100);
  };

  const handleClearLogs = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tất cả lịch sử nhật ký bảo mật?')) {
      clearSecurityLogs();
      setSecurityLogs([]);
      showToast('Đã xóa nhật ký bảo mật!', 'info');
    }
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
        <p style={{ color: 'var(--text-secondary)' }}>Tùy chỉnh giao diện và trung tâm bảo mật website</p>
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
                  {localLogo.startsWith('http') ? (
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
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" style={{ gap: '8px' }} onClick={handleLogoChange}>
                      <Upload size={16} />
                      Tải logo mới
                    </button>
                    <button className="btn-ghost" style={{ gap: '8px' }} onClick={handleResetLogo}>
                      <RefreshCw size={16} />
                      Hoàn tác logo cũ
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

            {/* SAVE ACTION */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" style={{ gap: '8px' }} onClick={handleSave}>
                <Save size={16} />
                Lưu cấu hình giao diện
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
                  Tự động khóa đăng nhập <strong>60 giây</strong> nếu nhập sai mật khẩu 5 lần liên tiếp.
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


    </div>
  );
};

export default SettingsPage;
