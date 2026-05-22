import React, { useState } from 'react';
import { api } from '../services/api';
import { Mail, Lock, User, Phone, CheckCircle, RefreshCw, KeyRound } from 'lucide-react';

const LoginPage = ({ onLoginSuccess, triggerToast }) => {
  const [isRegister, setIsRegister] = useState(false);
  
  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regGithub, setRegGithub] = useState('');
  const [regSkills, setRegSkills] = useState('');
  const [regPortfolio, setRegPortfolio] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regPreferredPlatforms, setRegPreferredPlatforms] = useState('');
  const [regAvailability, setRegAvailability] = useState('');
  
  const [loading, setLoading] = useState(false);

  // Xử lý đăng nhập
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      triggerToast('Vui lòng điền đủ Tên đăng nhập và Mật khẩu', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const data = await api.auth.login(loginUsername, loginPassword);
      triggerToast(`Chào mừng ${data.user.role === 'admin' ? 'Quản trị viên' : 'Cộng tác viên'} ${data.user.username} quay trở lại!`, 'success');
      onLoginSuccess(data.user);
    } catch (err) {
      triggerToast(err.message || 'Đăng nhập không thành công', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý đăng ký
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regName || !regPhone || !regEmail) {
      triggerToast('Vui lòng điền đầy đủ các thông tin bắt buộc', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.register({
        username: regUsername,
        password: regPassword,
        name: regName,
        phone: regPhone,
        email: regEmail,
        githubUsername: regGithub,
        skills: regSkills,
        portfolioUrl: regPortfolio,
        bio: regBio,
        preferredPlatforms: regPreferredPlatforms,
        availability: regAvailability
      });
      triggerToast(res.message || 'Đăng ký CTV thành công!', 'success');
      
      // Reset form & chuyển sang tab đăng nhập
      setIsRegister(false);
      setLoginUsername(regUsername);
      setLoginPassword('');
    } catch (err) {
      triggerToast(err.message || 'Đăng ký tài khoản thất bại', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'var(--bg-main)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Blur Background Spheres */}
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, rgba(0,0,0,0) 70%)',
        top: '10%',
        left: '15%',
        filter: 'blur(50px)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, rgba(0,0,0,0) 70%)',
        bottom: '15%',
        right: '15%',
        filter: 'blur(60px)',
        zIndex: 0
      }}></div>

      {/* Main Glassmorphism Card Container */}
      <div className="card glass-card" style={{
        width: '100%',
        maxWidth: isRegister ? '600px' : '420px',
        padding: '2.5rem',
        zIndex: 1,
        borderRadius: 'var(--border-radius-lg)',
        boxShadow: 'var(--card-shadow)',
        border: '1px solid var(--border-color)',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* App Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            color: '#fff',
            marginBottom: '1rem',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)'
          }}>
            <KeyRound size={24} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-title)', fontWeight: '700', margin: '0 0 0.35rem 0' }}>
            CollabTask
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isRegister ? 'Đăng ký tài khoản CTV để nhận nhiệm vụ' : 'Hệ thống Quản lý Cộng tác viên Online'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-sm)',
          padding: '0.25rem',
          marginBottom: '1.5rem'
        }}>
          <button
            style={{
              flex: 1,
              padding: '0.5rem',
              fontSize: '0.82rem',
              borderRadius: '6px',
              border: 'none',
              background: !isRegister ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: !isRegister ? 'var(--text-title)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: !isRegister ? '600' : '400',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setIsRegister(false)}
          >
            Đăng nhập
          </button>
          <button
            style={{
              flex: 1,
              padding: '0.5rem',
              fontSize: '0.82rem',
              borderRadius: '6px',
              border: 'none',
              background: isRegister ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: isRegister ? 'var(--text-title)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: isRegister ? '600' : '400',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setIsRegister(true)}
          >
            Đăng ký CTV
          </button>
        </div>

        {/* --- LOGIN FORM --- */}
        {!isRegister ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.45rem', fontWeight: '500' }}>Tên tài khoản</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="admin hoặc hoang"
                  className="form-control"
                  style={{ paddingLeft: '36px', height: '42px', fontSize: '0.88rem' }}
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>Admin: <b>admin</b> | CTV: <b>hoang</b> hoặc <b>mai</b></span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.45rem', fontWeight: '500' }}>Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="form-control"
                  style={{ paddingLeft: '36px', height: '42px', fontSize: '0.88rem' }}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>Admin: <b>admin123</b> | CTV: <b>ctv123</b></span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                height: '42px',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập hệ thống'
              )}
            </button>
          </form>
        ) : (
          /* --- REGISTER FORM --- */
          <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>Họ và tên *</label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                className="form-control"
                style={{ height: '38px', fontSize: '0.82rem' }}
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>Tên đăng nhập *</label>
              <input
                type="text"
                placeholder="nguyenvana"
                className="form-control"
                style={{ height: '38px', fontSize: '0.82rem' }}
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>Mật khẩu *</label>
              <input
                type="password"
                placeholder="••••••••"
                className="form-control"
                style={{ height: '38px', fontSize: '0.82rem' }}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>Số điện thoại *</label>
              <input
                type="tel"
                placeholder="09xxxxxxxx"
                className="form-control"
                style={{ height: '38px', fontSize: '0.82rem' }}
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>Địa chỉ Email *</label>
              <input
                type="email"
                placeholder="email@gmail.com"
                className="form-control"
                style={{ height: '38px', fontSize: '0.82rem' }}
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>GitHub Username (Nếu có)</label>
              <input
                type="text"
                placeholder="username-github"
                className="form-control"
                style={{ height: '38px', fontSize: '0.82rem' }}
                value={regGithub}
                onChange={(e) => setRegGithub(e.target.value)}
                disabled={loading}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>Phục vụ tính năng tự động liên kết và theo dõi realtime tiến độ trên Github.</span>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>Kỹ năng chính</label>
              <input
                type="text"
                placeholder="React, NodeJS, Viết content, Thiết kế UI"
                className="form-control"
                style={{ height: '38px', fontSize: '0.82rem' }}
                value={regSkills}
                onChange={(e) => setRegSkills(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>Portfolio URL</label>
              <input
                type="url"
                placeholder="https://github.com/username"
                className="form-control"
                style={{ height: '38px', fontSize: '0.82rem' }}
                value={regPortfolio}
                onChange={(e) => setRegPortfolio(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>Nền tảng muốn nhận</label>
              <input
                type="text"
                placeholder="GitHub / React, NodeJS, Markdown"
                className="form-control"
                style={{ height: '38px', fontSize: '0.82rem' }}
                value={regPreferredPlatforms}
                onChange={(e) => setRegPreferredPlatforms(e.target.value)}
                disabled={loading}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>Thời gian có thể làm việc</label>
              <input
                type="text"
                placeholder="Ví dụ: 20h/tuần, buổi tối, cuối tuần"
                className="form-control"
                style={{ height: '38px', fontSize: '0.82rem' }}
                value={regAvailability}
                onChange={(e) => setRegAvailability(e.target.value)}
                disabled={loading}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: '500' }}>Giới thiệu ngắn</label>
              <textarea
                placeholder="Tóm tắt kinh nghiệm, dự án đã làm, điểm mạnh của bạn..."
                className="form-control"
                rows="3"
                style={{ fontSize: '0.82rem', resize: 'vertical' }}
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                gridColumn: 'span 2',
                height: '42px',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                fontWeight: '600'
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  Đang xử lý đăng ký...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Hoàn tất đăng ký tài khoản
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
