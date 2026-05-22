import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Menu, 
  Shield, 
  Users, 
  ChevronDown,
  Wallet,
  Bell,
  Check
} from 'lucide-react';
import { api } from '../services/api';

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
  setActiveTab,
  notifications = [],
  setNotifications,
  onDataChange
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const currentCtv = collaborators.find(c => c.id === selectedCollaborator) || collaborators[0];
  const unreadCount = notifications.filter(n => !n.readAt).length;

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

  const handleMarkAllNotificationsRead = async () => {
    await api.notifications.markAllRead();
    setNotifications?.(notifications.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    if (onDataChange) onDataChange();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.readAt) {
      await api.notifications.markRead(notification.id);
      setNotifications?.(notifications.map(n => n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n));
    }
    if (notification.entityType === 'submission') setActiveTab(currentRole === 'admin' ? 'submissions' : 'my-submissions');
    if (notification.entityType === 'payout') setActiveTab(currentRole === 'admin' ? 'payouts' : 'my-wallet');
    if (notification.entityType === 'task') setActiveTab(currentRole === 'admin' ? 'tasks' : 'my-tasks');
    setShowNotifications(false);
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
      case 'ctv-agent-api': return 'Cổng API AI Agent';
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

        <div style={{ position: 'relative' }}>
          <button
            className="theme-toggle-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Thông báo"
            style={{ position: 'relative' }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                minWidth: '18px',
                height: '18px',
                padding: '0 5px',
                borderRadius: '9999px',
                background: 'var(--danger)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-main)'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 0.75rem)',
              right: 0,
              width: '340px',
              maxWidth: 'calc(100vw - 2rem)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '1rem',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.22)',
              zIndex: 30,
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.9rem 1rem',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div>
                  <div style={{ fontWeight: '800', color: 'var(--text-title)' }}>Thông báo</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unreadCount} chưa đọc</div>
                </div>
                {notifications.length > 0 && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleMarkAllNotificationsRead}
                    style={{ padding: '0.45rem 0.65rem', fontSize: '0.75rem' }}
                  >
                    <Check size={14} />
                    Đã đọc
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '1.25rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.9rem' }}>
                    Chưa có thông báo mới.
                  </div>
                ) : notifications.slice(0, 10).map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.9rem 1rem',
                      border: 0,
                      borderBottom: '1px solid var(--border-color)',
                      background: notification.readAt ? 'transparent' : 'var(--bg-card-hover)',
                      color: 'inherit',
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                      {!notification.readAt && (
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          marginTop: '0.35rem',
                          flexShrink: 0
                        }} />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '800', color: 'var(--text-title)', fontSize: '0.88rem' }}>
                          {notification.title}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', lineHeight: 1.45 }}>
                          {notification.message}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.45rem' }}>
                          {new Date(notification.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
