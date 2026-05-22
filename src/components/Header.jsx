import React from 'react';
import { 
  Sun, 
  Moon, 
  Menu, 
  Shield, 
  Users, 
  ChevronDown,
  Wallet
} from 'lucide-react';

const Header = ({ 
  currentRole, 
  setCurrentRole, 
  selectedCollaborator, 
  setSelectedCollaborator,
  collaborators, 
  theme, 
  setTheme, 
  sidebarOpen, 
  setSidebarOpen,
  activeTab,
  setActiveTab
}) => {
  const currentCtv = collaborators.find(c => c.id === selectedCollaborator) || collaborators[0];

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const handleRoleToggle = () => {
    if (currentRole === 'admin') {
      setCurrentRole('collaborator');
      setActiveTab('portal');
    } else {
      setCurrentRole('admin');
      setActiveTab('dashboard');
    }
  };

  // Humanize title based on activeTab
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Bảng thống kê chung';
      case 'tasks': return 'Quản lý nhiệm vụ';
      case 'submissions': return 'Phê duyệt báo cáo nhiệm vụ';
      case 'collaborators': return 'Quản lý Cộng tác viên';
      case 'payouts': return 'Phê duyệt yêu cầu thanh toán';
      case 'portal': return 'Cổng thông tin CTV';
      case 'my-tasks': return 'Bảng nhận nhiệm vụ';
      case 'my-submissions': return 'Lịch sử báo cáo đã nộp';
      case 'my-wallet': return 'Ví tiền & Yêu cầu rút tiền';
      default: return 'Hệ thống Quản lý CTV';
    }
  };

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button 
          className="mobile-nav-toggle" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation drawer"
        >
          <Menu size={24} />
        </button>
        <div className="header-title-area">
          <h2>{getTabTitle()}</h2>
        </div>
      </div>

      <div className="header-actions">
        {/* If in collaborator portal, show a quick switcher to simulate different CTVs */}
        {currentRole === 'collaborator' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đóng vai CTV:</span>
            <div style={{ position: 'relative' }}>
              <select
                className="form-control"
                value={selectedCollaborator}
                onChange={(e) => setSelectedCollaborator(parseInt(e.target.value))}
                style={{ 
                  padding: '0.4rem 2rem 0.4rem 0.8rem', 
                  fontSize: '0.8rem', 
                  borderRadius: '9999px',
                  width: '160px',
                  cursor: 'pointer',
                  appearance: 'none',
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-title)',
                  fontWeight: '600'
                }}
              >
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown 
                size={14} 
                style={{ 
                  position: 'absolute', 
                  right: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)',
                  pointerEvents: 'none' 
                }} 
              />
            </div>
            
            {/* Balance Indicator in Header */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem', 
                background: 'var(--success-bg)', 
                color: 'var(--success)', 
                padding: '0.4rem 0.8rem', 
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: '700'
              }}
            >
              <Wallet size={14} />
              <span>{(currentCtv?.balance || 0).toLocaleString()}đ</span>
            </div>
          </div>
        )}

        {/* Dynamic switcher between Admin and Collaborator simulated views */}
        <button className="role-switcher-btn" onClick={handleRoleToggle}>
          {currentRole === 'admin' ? (
            <>
              <Users size={16} />
              <span>Chuyển sang Cổng CTV</span>
            </>
          ) : (
            <>
              <Shield size={16} />
              <span>Chuyển sang Admin</span>
            </>
          )}
        </button>

        {/* Sun/Moon Theme Toggle */}
        <button 
          className="theme-toggle-btn" 
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
