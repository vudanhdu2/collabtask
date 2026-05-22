import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AdminDashboard from './components/AdminDashboard';
import AdminTasks from './components/AdminTasks';
import AdminSubmissions from './components/AdminSubmissions';
import AdminCollaborators from './components/AdminCollaborators';
import AdminPayouts from './components/AdminPayouts';
import CollaboratorPortal from './components/CollaboratorPortal';
import AdminGitTracker from './components/AdminGitTracker';
import LoginPage from './components/LoginPage';
import AdminAgentApi from './components/AdminAgentApi';
import { api } from './services/api';

function App() {
  // --- STATES & STORAGE SYNCHRONIZATION ---
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  
  // Authentication & Session States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // { id, username, role, ctvDetails }
  const [currentRole, setCurrentRole] = useState('collaborator'); // admin or collaborator
  const [selectedCollaborator, setSelectedCollaborator] = useState(null); // ID of currently active collaborator
  const [globalLoading, setGlobalLoading] = useState(true);

  // App Layout States
  const [activeTab, setActiveTab] = useState('dashboard'); // virtual routing
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Local State Arrays populated from Backend API
  const [collaborators, setCollaborators] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [payouts, setPayouts] = useState([]);

  // Check existing token on startup
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('collabtask_token');
      if (!token) {
        setGlobalLoading(false);
        return;
      }

      try {
        const user = await api.auth.me();
        setIsAuthenticated(true);
        setCurrentUser(user);
        setCurrentRole(user.role);
        if (user.role === 'collaborator' && user.ctvDetails) {
          setSelectedCollaborator(user.ctvDetails.id);
        }
      } catch (err) {
        // Token invalid/expired
        localStorage.removeItem('collabtask_token');
      } finally {
        setGlobalLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch all database records from Backend API
  const loadAllData = async () => {
    if (!isAuthenticated) return;
    try {
      const tasksData = await api.tasks.list();
      setTasks(tasksData);

      const subsData = await api.submissions.list();
      setSubmissions(subsData);

      const payoutsData = await api.payouts.list();
      setPayouts(payoutsData);

      // CTVs list chỉ dành cho Admin
      if (currentUser && currentUser.role === 'admin') {
        const ctvsData = await api.collaborators.list();
        setCollaborators(ctvsData);
      } else if (currentUser && currentUser.ctvDetails) {
        // Nếu là CTV, danh sách collaborators chỉ chứa chính họ
        setCollaborators([currentUser.ctvDetails]);
      }
    } catch (err) {
      console.error('Không thể nạp dữ liệu từ Server API:', err);
    }
  };

  // Load data when user signs in
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
      // Set default tab based on role
      setActiveTab(currentUser?.role === 'admin' ? 'dashboard' : 'tasks');
    }
  }, [isAuthenticated, currentUser]);

  // Sync theme attribute to HTML tag
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // --- TOAST NOTIFICATIONS TRIGGER ---
  const triggerToast = (message, type = 'success') => {
    const id = Date.now();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after 4s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Handle Login Success
  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    setCurrentRole(user.role);
    if (user.role === 'collaborator' && user.ctvDetails) {
      setSelectedCollaborator(user.ctvDetails.id);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    api.auth.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentRole('collaborator');
    setSelectedCollaborator(null);
    setCollaborators([]);
    setTasks([]);
    setSubmissions([]);
    setPayouts([]);
    triggerToast('Đã đăng xuất hệ thống an toàn!', 'success');
  };

  // Render loading state
  if (globalLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        color: 'var(--text-title)',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spin-animation" style={{
          width: '30px',
          height: '30px',
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%'
        }}></div>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Đang tải cấu hình CollabTask...</span>
      </div>
    );
  }

  // Redirect to login if unauthenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLoginSuccess={handleLoginSuccess} triggerToast={triggerToast} />
        {/* Global Toast Container for Login Page */}
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // --- RENDER DYNAMIC COMPONENT PANEL ---
  const renderContentPanel = () => {
    if (currentRole === 'admin') {
      switch (activeTab) {
        case 'dashboard':
          return (
            <AdminDashboard 
              collaborators={collaborators}
              tasks={tasks}
              submissions={submissions}
              payouts={payouts}
              setActiveTab={setActiveTab}
            />
          );
        case 'tasks':
          return (
            <AdminTasks 
              tasks={tasks}
              setTasks={setTasks}
              submissions={submissions}
              collaborators={collaborators}
              triggerToast={triggerToast}
              onDataChange={loadAllData}
            />
          );
        case 'submissions':
          return (
            <AdminSubmissions 
              submissions={submissions}
              setSubmissions={setSubmissions}
              tasks={tasks}
              collaborators={collaborators}
              setCollaborators={setCollaborators}
              triggerToast={triggerToast}
              onDataChange={loadAllData}
            />
          );
        case 'collaborators':
          return (
            <AdminCollaborators 
              collaborators={collaborators}
              setCollaborators={setCollaborators}
              tasks={tasks}
              submissions={submissions}
              payouts={payouts}
              triggerToast={triggerToast}
              onDataChange={loadAllData}
            />
          );
        case 'payouts':
          return (
            <AdminPayouts 
              payouts={payouts}
              setPayouts={setPayouts}
              collaborators={collaborators}
              setCollaborators={setCollaborators}
              triggerToast={triggerToast}
              onDataChange={loadAllData}
            />
          );
        case 'git-tracker':
          return (
            <AdminGitTracker 
              collaborators={collaborators}
              setCollaborators={setCollaborators}
              tasks={tasks}
              submissions={submissions}
              setSubmissions={setSubmissions}
              triggerToast={triggerToast}
              onDataChange={loadAllData}
            />
          );
        case 'agent-api':
          return (
            <AdminAgentApi 
              triggerToast={triggerToast}
            />
          );
        default:
          return <div style={{ color: 'var(--text-muted)' }}>Mục này chưa được triển khai.</div>;
      }
    } else {
      // Collaborator Portal
      return (
        <CollaboratorPortal 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedCollaborator={selectedCollaborator}
          collaborators={collaborators}
          setCollaborators={setCollaborators}
          tasks={tasks}
          submissions={submissions}
          setSubmissions={setSubmissions}
          payouts={payouts}
          setPayouts={setPayouts}
          triggerToast={triggerToast}
          onDataChange={loadAllData}
        />
      );
    }
  };

  return (
    <div className="app-container">
      {/* 1. Sidebar Component (Navigation) */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        selectedCollaborator={selectedCollaborator}
        collaborators={collaborators}
        handleLogout={handleLogout}
      />

      {/* 2. Main Wrapper Panel */}
      <div className="main-wrapper">
        {/* Header containing theme switch, role switcher & profile settings */}
        <Header 
          currentRole={currentRole}
          setCurrentRole={setCurrentRole}
          selectedCollaborator={selectedCollaborator}
          setSelectedCollaborator={setSelectedCollaborator}
          collaborators={collaborators}
          theme={theme}
          setTheme={setTheme}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          handleLogout={handleLogout}
        />

        {/* Dynamic content rendering with layout grids */}
        <main className="content-container">
          {renderContentPanel()}
        </main>
      </div>

      {/* 3. Global Toast Notifications Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
