import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Users, 
  CreditCard, 
  ShieldAlert, 
  User, 
  Compass,
  History,
  Wallet,
  Menu,
  X,
  GitBranch,
  BookOpen,
  Cpu,
  Trophy,
  LogOut
} from 'lucide-react';


const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  currentRole, 
  sidebarOpen, 
  setSidebarOpen,
  selectedCollaborator,
  collaborators,
  handleLogout
}) => {
  const currentCtv = collaborators.find(c => c.id === selectedCollaborator) || collaborators[0];

  const adminMenu = [
    { id: 'dashboard', label: 'Bảng thống kê', icon: LayoutDashboard },
    { id: 'tasks', label: 'Nhiệm vụ', icon: Briefcase },
    { id: 'submissions', label: 'Duyệt báo cáo', icon: CheckSquare },
    { id: 'git-tracker', label: 'Theo dõi GitHub', icon: GitBranch },
    { id: 'collaborators', label: 'Cộng tác viên', icon: Users },
    { id: 'payouts', label: 'Yêu cầu rút tiền', icon: CreditCard },
    { id: 'agent-api', label: 'Cổng điều khiển Agent', icon: Cpu },
  ];

  const collaboratorMenu = [
    { id: 'portal', label: 'Cổng thông tin', icon: Compass },
    { id: 'my-tasks', label: 'Nhiệm vụ làm việc', icon: Briefcase },
    { id: 'my-submissions', label: 'Lịch sử báo cáo', icon: History },
    { id: 'my-wallet', label: 'Ví & Thanh toán', icon: Wallet },
    { id: 'leaderboard', label: 'Bảng xếp hạng', icon: Trophy },
    { id: 'guide-terms', label: 'Hướng dẫn & Điều khoản', icon: BookOpen },
  ];

  const activeMenu = currentRole === 'admin' ? adminMenu : collaboratorMenu;

  return (
    <>
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo-area">
          <div className="sidebar-logo-icon">
            <Users size={20} />
          </div>
          <span className="sidebar-logo-text">CollabTask</span>
          {sidebarOpen && (
            <button 
              className="mobile-nav-toggle" 
              onClick={() => setSidebarOpen(false)}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-menu">
          <div className="sidebar-menu-title">
            {currentRole === 'admin' ? 'Bảng quản trị' : 'Khu vực CTV'}
          </div>
          {activeMenu.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false); // Close sidebar on mobile select
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            <div className="user-avatar" style={{ flexShrink: 0 }}>
              {currentRole === 'admin' ? 'AD' : (currentCtv?.name ? currentCtv.name.substring(0, 2).toUpperCase() : 'CTV')}
            </div>
            <div className="sidebar-profile-info" style={{ minWidth: 0 }}>
              <p className="sidebar-profile-name">
                {currentRole === 'admin' ? 'Admin Manager' : (currentCtv?.name || 'Tài khoản')}
              </p>
              <p className="sidebar-profile-role" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentRole === 'admin' ? 'Quản trị viên' : (currentCtv?.phone ? `Cộng tác viên (${currentCtv.phone})` : 'Cộng tác viên')}
              </p>
            </div>
          </div>
          <button 
            className="sidebar-logout-btn" 
            onClick={handleLogout}
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
