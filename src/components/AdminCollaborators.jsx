import React, { useState, useEffect } from 'react';
import { Search, Plus, UserX, UserCheck, Trash2, Mail, Phone, Calendar, GitCommit, GitPullRequest, RefreshCw, ExternalLink } from 'lucide-react';
import Modal from './UI/Modal';
import { api } from '../services/api';

// GitHub username mapping for each CTV
const ctvGitMapping = {
  1: 'hoang-nv-dev',
  2: 'tranthimai',
  3: 'namlh-coder',
  4: 'ducpm-suspend'
};

const AdminCollaborators = ({ collaborators, setCollaborators, tasks, submissions, payouts, triggerToast, onDataChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCtvDetails, setSelectedCtvDetails] = useState(null);

  // GitHub realtime tracking state
  const [gitCommits, setGitCommits] = useState([]);
  const [gitPRs, setGitPRs] = useState([]);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitStatus, setGitStatus] = useState('idle'); // idle, connected, rate_limited, error

  const githubPat = localStorage.getItem('github_pat') || '';
  const repoOwner = 'vudanhdu2';
  const repoName = 'aihot-vn';

  // Fetch GitHub activity for a specific CTV
  const fetchCtvGitHub = async (gitUsername) => {
    if (!gitUsername) return;
    setGitLoading(true);
    setGitStatus('idle');
    const headers = {};
    if (githubPat) headers['Authorization'] = `token ${githubPat}`;

    try {
      // Fetch commits by this author
      const commitsRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/commits?author=${gitUsername}&per_page=8`,
        { headers }
      );
      if (commitsRes.status === 403 || commitsRes.status === 429) throw new Error('rate_limit');
      if (!commitsRes.ok) throw new Error('api_error');

      const commitsData = await commitsRes.json();
      setGitCommits(commitsData.map(c => ({
        sha: c.sha,
        message: c.commit.message,
        date: c.commit.author.date,
        url: c.html_url,
        authorUsername: c.author?.login || gitUsername
      })));

      // Fetch PRs (all states, filter client-side by author)
      const prsRes = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=all&per_page=30`,
        { headers }
      );
      if (prsRes.ok) {
        const prsData = await prsRes.json();
        const myPrs = prsData.filter(p => p.user?.login === gitUsername).slice(0, 8);
        setGitPRs(myPrs.map(p => ({
          number: p.number,
          title: p.title,
          state: p.merged_at ? 'merged' : p.state,
          url: p.html_url,
          createdAt: p.created_at
        })));
      } else {
        setGitPRs([]);
      }

      setGitStatus('connected');
    } catch (err) {
      if (err.message === 'rate_limit') {
        setGitStatus('rate_limited');
      } else {
        setGitStatus('error');
      }
      setGitCommits([]);
      setGitPRs([]);
    } finally {
      setGitLoading(false);
    }
  };

  // Auto-fetch GitHub data when a CTV is selected
  useEffect(() => {
    if (selectedCtvDetails) {
      const gitUser = ctvGitMapping[selectedCtvDetails.id];
      if (gitUser) {
        fetchCtvGitHub(gitUser);
      } else {
        setGitCommits([]);
        setGitPRs([]);
        setGitStatus('idle');
      }
    }
  }, [selectedCtvDetails]);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [initialBalance, setInitialBalance] = useState(0);

  const handleOpenModal = () => {
    setName('');
    setPhone('');
    setEmail('');
    setInitialBalance(0);
    setIsModalOpen(true);
  };

  const handleCreateCollaborator = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) {
      triggerToast('Vui lòng nhập đầy đủ thông tin CTV!', 'danger');
      return;
    }

    const isDuplicate = collaborators.some(c => c.phone === phone || c.email === email);
    if (isDuplicate) {
      triggerToast('Số điện thoại hoặc email đã tồn tại!', 'danger');
      return;
    }

    try {
      await api.collaborators.create({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        balance: parseInt(initialBalance) || 0,
        status: 'active'
      });
      triggerToast('Thêm Cộng tác viên mới thành công!', 'success');
      if (onDataChange) onDataChange();
      setIsModalOpen(false);
    } catch (err) {
      triggerToast('Không thể tạo CTV: ' + err.message, 'danger');
    }
  };

  const handleToggleStatus = async (id) => {
    const ctv = collaborators.find(c => c.id === id);
    if (!ctv) return;
    const nextStatus = ctv.status === 'active' ? 'suspended' : 'active';
    
    try {
      await api.collaborators.toggleStatus(id, nextStatus);
      triggerToast(
        `Cộng tác viên ${ctv.name} đã bị ${nextStatus === 'active' ? 'kích hoạt lại' : 'tạm khóa'}!`, 
        nextStatus === 'active' ? 'success' : 'danger'
      );
      if (onDataChange) onDataChange();
    } catch (err) {
      triggerToast('Lỗi cập nhật trạng thái CTV: ' + err.message, 'danger');
    }
  };

  const handleApproveRegister = async (id) => {
    const ctv = collaborators.find(c => c.id === id);
    if (!ctv) return;
    
    try {
      await api.collaborators.toggleStatus(id, 'active');
      triggerToast(`Đã duyệt đơn đăng ký của CTV ${ctv.name}!`, 'success');
      if (onDataChange) onDataChange();
    } catch (err) {
      triggerToast('Lỗi phê duyệt CTV: ' + err.message, 'danger');
    }
  };

  const handleDeleteCtv = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa Cộng tác viên ${name} khỏi hệ thống không?`)) {
      try {
        await api.collaborators.delete(id);
        triggerToast(`Đã xóa CTV ${name}!`, 'danger');
        if (onDataChange) onDataChange();
      } catch (err) {
        triggerToast('Lỗi xóa CTV: ' + err.message, 'danger');
      }
    }
  };

  // Filter & Enrich Data Logic
  const getEnrichedCollaborators = () => {
    return collaborators.map(ctv => {
      // Completed Approved Tasks
      const completedTasks = submissions.filter(s => s.ctvId === ctv.id && s.status === 'approved').length;
      
      // Total Paid
      const totalWithdrawn = payouts
        .filter(p => p.ctvId === ctv.id && p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        ...ctv,
        completedTasks,
        totalWithdrawn
      };
    });
  };

  const filteredCtvs = getEnrichedCollaborators().filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.phone.includes(searchQuery) ||
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      {/* Search & Actions Panel */}
      <div 
        className="glass-card" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm theo tên, SĐT, Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
          </div>

          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="All">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="pending">Chờ phê duyệt</option>
            <option value="suspended">Đã tạm khóa</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={18} />
          <span>Thêm CTV thủ công</span>
        </button>
      </div>

      {/* Collaborators Table */}
      <div className="glass-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ tên CTV</th>
                <th>Thông tin liên hệ</th>
                <th>Ngày tham gia</th>
                <th>Số việc đã làm</th>
                <th>Số dư hiện tại</th>
                <th>Đã thanh toán</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCtvs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    Không tìm thấy Cộng tác viên nào phù hợp!
                  </td>
                </tr>
              ) : (
                filteredCtvs.map((ctv) => (
                  <tr key={ctv.id} onClick={() => setSelectedCtvDetails(ctv)} style={{ cursor: 'pointer' }} className="hover-card-bg">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '0.8rem' }}>
                          {ctv.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-title)' }}>{ctv.name}</strong>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {ctv.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-main)' }}>
                          <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                          {ctv.phone}
                        </p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          <Mail size={12} />
                          {ctv.email}
                        </p>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                        {new Date(ctv.joinedAt).toLocaleDateString('vi-VN')}
                      </p>
                    </td>
                    <td style={{ fontWeight: '600', paddingLeft: '2rem' }}>
                      {ctv.completedTasks}
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                      {ctv.balance.toLocaleString()}đ
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--success)' }}>
                      {ctv.totalWithdrawn.toLocaleString()}đ
                    </td>
                    <td>
                      {ctv.status === 'active' && <span className="badge badge-success">Hoạt động</span>}
                      {ctv.status === 'pending' && <span className="badge badge-warning">Chờ duyệt</span>}
                      {ctv.status === 'suspended' && <span className="badge badge-danger">Tạm khóa</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {ctv.status === 'pending' ? (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => { e.stopPropagation(); handleApproveRegister(ctv.id); }}
                            title="Phê duyệt đơn gia nhập"
                            style={{ padding: '0.35rem 0.6rem' }}
                          >
                            <UserCheck size={14} style={{ color: 'var(--success)' }} />
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(ctv.id); }}
                            title={ctv.status === 'active' ? 'Khóa cộng tác viên' : 'Kích hoạt lại'}
                            style={{ padding: '0.35rem 0.6rem' }}
                          >
                            {ctv.status === 'active' ? (
                              <UserX size={14} style={{ color: 'var(--warning)' }} />
                            ) : (
                              <UserCheck size={14} style={{ color: 'var(--success)' }} />
                            )}
                          </button>
                        )}
                        
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCtv(ctv.id, ctv.name); }}
                          title="Xóa CTV khỏi hệ thống"
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add CTV Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thêm Cộng tác viên mới"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </button>
            <button className="btn btn-primary" onClick={handleCreateCollaborator}>
              Thêm CTV
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateCollaborator}>
          <div className="form-group">
            <label>Họ và tên *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Nhập họ và tên..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Số điện thoại liên hệ *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ví dụ: 0987654321"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Địa chỉ Email *</label>
            <input
              type="email"
              className="form-control"
              placeholder="Ví dụ: ctv.email@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Số dư ví ban đầu (VNĐ)</label>
            <input
              type="number"
              className="form-control"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              min="0"
              step="10000"
            />
          </div>
        </form>
      </Modal>

      {/* Collaborator Deep-Dive Modal */}
      {selectedCtvDetails && (() => {
        const mySubmissions = submissions.filter(s => s.ctvId === selectedCtvDetails.id);
        const myPayouts = payouts.filter(p => p.ctvId === selectedCtvDetails.id);
        const completed = mySubmissions.filter(s => s.status === 'approved').length;
        const pending = mySubmissions.filter(s => s.status === 'pending').length;
        const rejected = mySubmissions.filter(s => s.status === 'rejected').length;
        const totalSub = mySubmissions.length;
        const totalEarned = mySubmissions.filter(s => s.status === 'approved').reduce((sum, s) => sum + s.reward, 0);
        const totalWithdrawn = myPayouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

        return (
          <Modal
            isOpen={!!selectedCtvDetails}
            onClose={() => setSelectedCtvDetails(null)}
            title="Hồ sơ chi tiết Cộng tác viên"
            footer={
              <button className="btn btn-secondary" onClick={() => setSelectedCtvDetails(null)}>
                Đóng
              </button>
            }
          >
            <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {/* Profile Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div className="user-avatar" style={{ width: '56px', height: '56px', fontSize: '1.4rem', flexShrink: 0 }}>
                  {selectedCtvDetails.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-title)' }}>{selectedCtvDetails.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.15rem 0' }}>CTV ID: {selectedCtvDetails.id}</p>
                  <span className={`badge badge-${selectedCtvDetails.status === 'active' ? 'success' : selectedCtvDetails.status === 'pending' ? 'warning' : 'danger'}`} style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>
                    {selectedCtvDetails.status === 'active' ? 'Đang hoạt động' : selectedCtvDetails.status === 'pending' ? 'Chờ duyệt' : 'Tạm khóa'}
                  </span>
                </div>
              </div>

              {/* Personal Details */}
              <div style={{ fontSize: '0.85rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Số điện thoại:</span>
                  <p style={{ fontWeight: '600', color: 'var(--text-title)', margin: '0.15rem 0 0' }}>{selectedCtvDetails.phone}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Địa chỉ Email:</span>
                  <p style={{ fontWeight: '600', color: 'var(--text-title)', margin: '0.15rem 0 0' }}>{selectedCtvDetails.email}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Ngày gia nhập:</span>
                  <p style={{ fontWeight: '600', color: 'var(--text-title)', margin: '0.15rem 0 0' }}>{new Date(selectedCtvDetails.joinedAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              {(selectedCtvDetails.skills?.length > 0 || selectedCtvDetails.portfolioUrl || selectedCtvDetails.bio || selectedCtvDetails.preferredPlatforms?.length > 0 || selectedCtvDetails.availability) && (
                <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.85rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.75rem', fontWeight: '600' }}>Hồ sơ năng lực</h4>
                  {selectedCtvDetails.skills?.length > 0 && (
                    <div style={{ marginBottom: '0.65rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Kỹ năng:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {selectedCtvDetails.skills.map(skill => <span key={skill} className="badge badge-info">{skill}</span>)}
                      </div>
                    </div>
                  )}
                  {selectedCtvDetails.preferredPlatforms?.length > 0 && (
                    <div style={{ marginBottom: '0.65rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '0.35rem' }}>Nền tảng muốn nhận:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {selectedCtvDetails.preferredPlatforms.map(platform => <span key={platform} className="badge badge-secondary">{platform}</span>)}
                      </div>
                    </div>
                  )}
                  {selectedCtvDetails.portfolioUrl && (
                    <p style={{ fontSize: '0.8rem', marginBottom: '0.45rem' }}>
                      <strong>Portfolio:</strong>{' '}
                      <a href={selectedCtvDetails.portfolioUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', wordBreak: 'break-all' }}>{selectedCtvDetails.portfolioUrl}</a>
                    </p>
                  )}
                  {selectedCtvDetails.availability && <p style={{ fontSize: '0.8rem', marginBottom: '0.45rem' }}><strong>Thời gian:</strong> {selectedCtvDetails.availability}</p>}
                  {selectedCtvDetails.bio && <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.5', margin: 0 }}><strong>Giới thiệu:</strong> {selectedCtvDetails.bio}</p>}
                </div>
              )}

              {/* Financial Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem', background: 'rgba(99, 102, 241, 0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.85rem', textAlign: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Số dư ví</p>
                  <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>{selectedCtvDetails.balance.toLocaleString()}đ</strong>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Đã duyệt nhận</p>
                  <strong style={{ fontSize: '1rem', color: 'var(--success)' }}>{totalEarned.toLocaleString()}đ</strong>
                </div>
                <div>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Đã rút</p>
                  <strong style={{ fontSize: '1rem', color: 'var(--danger)' }}>{totalWithdrawn.toLocaleString()}đ</strong>
                </div>
              </div>

              {/* Task Completion Status Bar */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.5rem', fontWeight: '600' }}>Tỷ lệ công việc ({totalSub} lần nộp):</h4>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--border-color)', marginBottom: '0.5rem' }}>
                  {totalSub > 0 && <div style={{ width: `${(completed / totalSub) * 100}%`, background: 'var(--success)', transition: 'width 0.4s ease' }}></div>}
                  {totalSub > 0 && <div style={{ width: `${(pending / totalSub) * 100}%`, background: 'var(--warning)', transition: 'width 0.4s ease' }}></div>}
                  {totalSub > 0 && <div style={{ width: `${(rejected / totalSub) * 100}%`, background: 'var(--danger)', transition: 'width 0.4s ease' }}></div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>✅ Duyệt: {completed}</span>
                  <span>⏳ Chờ duyệt: {pending}</span>
                  <span>❌ Từ chối: {rejected}</span>
                </div>
              </div>

              {/* GitHub Realtime Activity */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <GitCommit size={15} style={{ color: 'var(--primary)' }} />
                    Hoạt động GitHub Realtime
                    {gitStatus === 'connected' && (
                      <span className="badge badge-success" style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem', marginLeft: '0.25rem' }}>
                        <span className="led-pulsing" style={{ background: 'var(--success)' }}></span>
                        Live
                      </span>
                    )}
                    {gitStatus === 'rate_limited' && (
                      <span className="badge badge-warning" style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem' }}>Rate Limited</span>
                    )}
                    {gitStatus === 'error' && (
                      <span className="badge badge-danger" style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem' }}>Lỗi kết nối</span>
                    )}
                  </h4>
                  {ctvGitMapping[selectedCtvDetails.id] && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                      onClick={() => fetchCtvGitHub(ctvGitMapping[selectedCtvDetails.id])}
                      disabled={gitLoading}
                    >
                      <RefreshCw size={11} className={gitLoading ? 'spin-animation' : ''} />
                      <span>Làm mới</span>
                    </button>
                  )}
                </div>

                {!ctvGitMapping[selectedCtvDetails.id] ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.25rem', fontSize: '0.78rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                    CTV này chưa liên kết tài khoản GitHub.
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Repo: <strong style={{ color: 'var(--primary)' }}>{repoOwner}/{repoName}</strong> · GitHub: <strong>@{ctvGitMapping[selectedCtvDetails.id]}</strong>
                    </p>

                    {/* Commits */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-title)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <GitCommit size={12} /> Commits gần đây ({gitCommits.length})
                      </p>
                      {gitLoading ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Đang tải dữ liệu từ GitHub...</div>
                      ) : gitCommits.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '0.75rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                          Chưa có commit nào từ CTV này.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {gitCommits.map((c, i) => (
                            <div key={c.sha + i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.45rem 0.6rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '5px', fontSize: '0.75rem', gap: '0.5rem' }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ margin: 0, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</p>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  {new Date(c.date).toLocaleDateString('vi-VN')} {new Date(c.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <a href={c.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.68rem', color: 'var(--primary)', flexShrink: 0, fontFamily: 'monospace' }}>
                                {c.sha.substring(0, 7)}
                                <ExternalLink size={9} />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pull Requests */}
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-title)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <GitPullRequest size={12} /> Pull Requests ({gitPRs.length})
                      </p>
                      {!gitLoading && gitPRs.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '0.75rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                          Chưa có Pull Request nào từ CTV này.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {gitPRs.map((pr) => (
                            <div key={pr.number} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.6rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '5px', fontSize: '0.75rem' }}>
                              <div style={{ minWidth: 0, flex: 1, marginRight: '0.5rem' }}>
                                <strong style={{ color: 'var(--text-title)', fontSize: '0.73rem' }}>#{pr.number}</strong>
                                <span style={{ marginLeft: '0.35rem', color: 'var(--text-main)' }}>{pr.title}</span>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>
                                  {new Date(pr.createdAt).toLocaleDateString('vi-VN')}
                                  {pr.url !== '#' && <> · <a href={pr.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Xem trên GitHub</a></>}
                                </p>
                              </div>
                              <div style={{ flexShrink: 0 }}>
                                {pr.state === 'open' && <span className="badge badge-success" style={{ fontSize: '0.55rem' }}>Open</span>}
                                {pr.state === 'closed' && <span className="badge badge-danger" style={{ fontSize: '0.55rem' }}>Closed</span>}
                                {pr.state === 'merged' && <span className="badge badge-info" style={{ fontSize: '0.55rem', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.25)' }}>Merged</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submissions History */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.5rem', fontWeight: '600' }}>Lịch sử làm việc:</h4>
                {mySubmissions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                    Chưa nộp báo cáo nào.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {mySubmissions.map(s => {
                      const t = tasks.find(x => x.id === s.taskId);
                      return (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.78rem' }}>
                          <div style={{ minWidth: 0, flex: 1, marginRight: '0.5rem' }}>
                            <strong style={{ color: 'var(--text-title)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t ? t.title : 'Nhiệm vụ đã xóa'}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Thưởng: {s.reward.toLocaleString()}đ | Nộp: {new Date(s.submittedAt).toLocaleDateString('vi-VN')} | <a href={s.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Xem Link</a>
                            </span>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {s.status === 'approved' && <span className="badge badge-success" style={{ fontSize: '0.55rem' }}>Duyệt</span>}
                            {s.status === 'pending' && <span className="badge badge-warning" style={{ fontSize: '0.55rem' }}>Chờ</span>}
                            {s.status === 'rejected' && <span className="badge badge-danger" style={{ fontSize: '0.55rem' }}>Từ chối</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payouts History */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.5rem', fontWeight: '600' }}>Lịch sử rút tiền:</h4>
                {myPayouts.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                    Chưa có yêu cầu thanh toán.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {myPayouts.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.78rem' }}>
                        <div>
                          <strong style={{ color: 'var(--text-title)' }}>{p.bankName}</strong>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>STK: {p.accountNumber} | {new Date(p.requestedAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: '600', color: 'var(--danger)' }}>-{p.amount.toLocaleString()}đ</span>
                          <span className={`badge badge-${p.status === 'paid' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}`} style={{ fontSize: '0.55rem', display: 'block', marginTop: '0.15rem' }}>
                            {p.status === 'paid' ? 'Thành công' : p.status === 'pending' ? 'Đang duyệt' : 'Bị từ chối'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default AdminCollaborators;
