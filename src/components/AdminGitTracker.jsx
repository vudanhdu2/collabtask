import React, { useState, useEffect, useRef } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest, 
  RefreshCw, 
  Settings, 
  Terminal, 
  Check, 
  X, 
  AlertCircle, 
  ExternalLink,
  Award,
  Zap
} from 'lucide-react';

import { api } from '../services/api';

const AdminGitTracker = ({ 
  collaborators, 
  setCollaborators, 
  tasks, 
  submissions, 
  setSubmissions, 
  triggerToast,
  onDataChange 
}) => {
  // Config state
  const [repoOwner, setRepoOwner] = useState('vudanhdu2');
  const [repoName, setRepoName] = useState('aihot-vn');
  const [appliedRepo, setAppliedRepo] = useState({ owner: 'vudanhdu2', name: 'aihot-vn' });
  const [githubPat, setGithubPat] = useState(() => localStorage.getItem('github_pat') || '');
  const [showConfig, setShowConfig] = useState(false);

  // Live Data state
  const [commits, setCommits] = useState([]);
  const [pullRequests, setPullRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // connected, rate_limited, offline
  const [activeSubTab, setActiveSubTab] = useState('commits'); // commits, pulls

  // Webhook Terminal state
  const [terminalLogs, setTerminalLogs] = useState([]);
  const terminalEndRef = useRef(null);

  // Danh sách mapping CTV lấy động từ database
  const ctvGitMapping = collaborators.map(c => ({
    gitUsername: c.githubUsername || '',
    ctvId: c.id,
    name: c.name
  })).filter(m => m.gitUsername !== '');

  // 1. Lấy logs từ backend API thực tế
  const fetchWebhookLogs = async () => {
    try {
      const logs = await api.webhook.getLogs();
      if (logs && logs.length > 0) {
        const formattedLogs = logs.map(l => ({
          id: l.id,
          time: new Date(l.timestamp).toLocaleTimeString('vi-VN'),
          text: `Webhook [${l.event.toUpperCase()}]: ${l.details}`,
          type: l.status === 'unmapped' || l.status === 'unmatched_task' ? 'warning' : l.event === 'push' ? 'info' : l.event === 'pull_request' ? 'success' : 'sys',
          status: l.status,
          taskId: l.taskId,
          ctvId: l.ctvId,
          submissionId: l.submissionId,
          url: l.url
        }));
        setTerminalLogs(formattedLogs.reverse());
      }
    } catch (err) {
      console.error('Không thể lấy logs webhook từ server:', err);
    }
  };

  // Tự động fetch logs mỗi 5s
  useEffect(() => {
    fetchWebhookLogs();
    const interval = setInterval(fetchWebhookLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load real data from GitHub REST API
  const fetchGitHubData = async (owner, name) => {
    setLoading(true);
    const headers = {};
    if (githubPat) {
      headers['Authorization'] = `token ${githubPat}`;
    }

    try {
      // 1. Fetch Commits
      const commitsRes = await fetch(
        `https://api.github.com/repos/${owner}/${name}/commits?per_page=10`, 
        { headers }
      );
      
      if (commitsRes.status === 403 || commitsRes.status === 429) {
        throw new Error('rate_limit');
      }
      if (!commitsRes.ok) {
        throw new Error('offline');
      }
      
      const commitsData = await commitsRes.json();
      const formattedCommits = commitsData.map(c => ({
        sha: c.sha,
        authorName: c.commit.author.name,
        authorUsername: c.author?.login || c.commit.author.email.split('@')[0],
        avatarUrl: c.author?.avatar_url || 'https://github.com/identicons/git.png',
        message: c.commit.message,
        url: c.html_url,
        date: c.commit.author.date
      }));

      setCommits(formattedCommits);

      // 2. Fetch Pull Requests
      const pullsRes = await fetch(
        `https://api.github.com/repos/${owner}/${name}/pulls?state=all&per_page=10`, 
        { headers }
      );
      
      let formattedPulls = [];
      if (pullsRes.ok) {
        const pullsData = await pullsRes.json();
        formattedPulls = pullsData.map(p => ({
          id: p.id,
          number: p.number,
          title: p.title,
          state: p.merged_at ? 'merged' : p.state, // open, closed, merged
          authorUsername: p.user?.login,
          avatarUrl: p.user?.avatar_url,
          url: p.html_url,
          createdAt: p.created_at,
          mergedAt: p.merged_at
        }));
        setPullRequests(formattedPulls);
      }

      setConnectionStatus('connected');
      
    } catch (err) {
      console.error(err);
      if (err.message === 'rate_limit') {
        setConnectionStatus('rate_limited');
      } else {
        setConnectionStatus('offline');
      }
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  // Mock data loader for fallback
  const loadMockData = () => {
    const mockCommits = [
      { sha: 'f2a7d8c91a0b3e5d7c9f81a2b3c4d5e6f7a8b9c0', authorName: 'Nguyễn Văn Hoàng', authorUsername: 'hoang', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80', message: 'feat: add realtime chat widget layout inside app dashboard', url: '#', date: new Date(Date.now() - 3600000).toISOString() },
      { sha: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', authorName: 'Trần Thị Mai', authorUsername: 'mai', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80', message: 'fix: align navbar layout responsive grid columns on iOS Safari', url: '#', date: new Date(Date.now() - 10800000).toISOString() }
    ];

    const mockPulls = [
      { id: 901, number: 12, title: 'feat: add realtime chat widget layout', state: 'merged', authorUsername: 'hoang', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80', createdAt: new Date(Date.now() - 7200000).toISOString(), mergedAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 902, number: 13, title: 'fix: align navbar layout responsive grid columns', state: 'open', authorUsername: 'mai', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80', createdAt: new Date(Date.now() - 10800000).toISOString(), mergedAt: null }
    ];

    setCommits(mockCommits);
    setPullRequests(mockPulls);
  };

  const addTerminalLog = (text, type = 'info') => {
    setTerminalLogs(prev => [
      ...prev,
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), text, type }
    ]);
  };

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Initial Fetch on load or applied repo change
  useEffect(() => {
    fetchGitHubData(appliedRepo.owner, appliedRepo.name);
  }, [appliedRepo]);

  const handleApplyConfig = (e) => {
    e.preventDefault();
    if (!repoOwner.trim() || !repoName.trim()) {
      triggerToast('Vui lòng nhập đầy đủ thông tin repository!', 'danger');
      return;
    }
    
    setAppliedRepo({ owner: repoOwner.trim(), name: repoName.trim() });
    if (githubPat.trim()) {
      localStorage.setItem('github_pat', githubPat.trim());
    } else {
      localStorage.removeItem('github_pat');
    }
    
    setShowConfig(false);
    triggerToast('Đã áp dụng cấu hình repo mới!', 'success');
  };

  // Trigger manual simulation of Push Event
  const simulatePushEvent = async () => {
    const devsWithGit = collaborators.filter(c => c.githubUsername && c.status === 'active');
    let targetDev;

    if (devsWithGit.length > 0) {
      const randomCtv = devsWithGit[Math.floor(Math.random() * devsWithGit.length)];
      targetDev = { username: randomCtv.githubUsername, name: randomCtv.name };
    } else {
      triggerToast('Vui lòng cập nhật Github Username cho CTV trong danh sách trước!', 'warning');
      return;
    }

    const messages = [
      'feat: integrate GitHub Webhook listener for real-time tracking',
      'fix: resolve layout shifting on mobile screen resizing',
      'refactor: extract custom Hook for GitHub REST API queries',
      'perf: load lazily non-critical icons to improve lighthouse score'
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    const sha = Math.random().toString(16).substring(2, 42);
    const shortSha = sha.substring(0, 7);

    try {
      const response = await fetch('/api/webhook/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'push'
        },
        body: JSON.stringify({
          ref: 'refs/heads/dev',
          commits: [{ id: sha, message: randomMsg }],
          sender: { login: targetDev.username },
          repository: { full_name: `${appliedRepo.owner}/${appliedRepo.name}` }
        })
      });

      if (response.ok) {
        triggerToast(`Đã nhận giả lập Commit mới từ CTV ${targetDev.name}!`, 'success');
        await fetchWebhookLogs();
        if (onDataChange) {
          await onDataChange();
        }
      }
    } catch (err) {
      console.error(err);
      triggerToast('Không thể gửi webhook giả lập!', 'danger');
    }
  };

  // Trigger manual simulation of Pull Request Event
  const simulatePREvent = async () => {
    const devsWithGit = collaborators.filter(c => c.githubUsername && c.status === 'active');
    let targetDev;

    if (devsWithGit.length > 0) {
      const randomCtv = devsWithGit[Math.floor(Math.random() * devsWithGit.length)];
      const activeTask = tasks.find(t => t.assignedCtvId === randomCtv.id && t.status === 'active') || tasks.find(t => t.status === 'active');
      targetDev = { username: randomCtv.githubUsername, name: randomCtv.name, taskCode: activeTask?.taskCode || (activeTask ? `task-${activeTask.id}` : 'task-102') };
    } else {
      triggerToast('Vui lòng cập nhật Github Username cho CTV trong danh sách trước!', 'warning');
      return;
    }

    const prNumber = Math.floor(Math.random() * 80) + 20;
    const prTitle = `feat: ${targetDev.taskCode} setup Github Realtime Tracker page (#${prNumber})`;

    try {
      const response = await fetch('/api/webhook/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'pull_request'
        },
        body: JSON.stringify({
          action: 'opened',
          number: prNumber,
          pull_request: {
            title: prTitle,
            body: `Automated test PR for ${targetDev.taskCode}`,
            merged: false,
            user: { login: targetDev.username },
            head: { ref: `feature/${targetDev.taskCode}-auto-test` },
            html_url: `https://github.com/${appliedRepo.owner}/${appliedRepo.name}/pull/${prNumber}`
          }
        })
      });

      if (response.ok) {
        triggerToast(`Đã nhận giả lập Pull Request mới từ CTV ${targetDev.name}!`, 'info');
        await fetchWebhookLogs();
        if (onDataChange) {
          await onDataChange();
        }
      }
    } catch (err) {
      console.error(err);
      triggerToast('Không thể gửi webhook giả lập!', 'danger');
    }
  };

  // Auto-approve reward for contributor (linked to PR or commit)
  const handleApproveContribution = async (authorUsername, rewardAmount, prNumber) => {
    const mapping = ctvGitMapping.find(m => m.gitUsername === authorUsername);
    if (!mapping) {
      triggerToast('Không khớp được tài khoản GitHub này với CTV nào trong hệ thống!', 'danger');
      return;
    }

    const prUrl = `https://github.com/${appliedRepo.owner}/${appliedRepo.name}/pull/${prNumber}`;
    const pendingSub = submissions.find(s => s.proofUrl === prUrl && s.status === 'pending');

    if (pendingSub) {
      try {
        await api.submissions.approve(pendingSub.id);
        triggerToast(`Đã duyệt thưởng thành công ${rewardAmount.toLocaleString()}đ cho CTV ${mapping.name}!`, 'success');
        if (onDataChange) {
          await onDataChange();
        }
      } catch (err) {
        triggerToast(err.message || 'Lỗi khi duyệt đóng góp!', 'danger');
      }
    } else {
      triggerToast(`Không tìm thấy báo cáo công việc tương ứng cho PR #${prNumber} trên hệ thống để duyệt!`, 'warning');
    }
  };

  return (
    <div>
      {/* Top Controls Bar */}
      <div 
        className="glass-card" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem 1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="sidebar-logo-icon" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
            <GitBranch size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Theo dõi GitHub (Live)
              {connectionStatus === 'connected' ? (
                <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
                  <span className="led-pulsing" style={{ background: 'var(--success)' }}></span>
                  GitHub Live Connected
                </span>
              ) : connectionStatus === 'rate_limited' ? (
                <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
                  <span className="led-pulsing" style={{ background: 'var(--warning)' }}></span>
                  GitHub API Rate Limit
                </span>
              ) : (
                <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
                  <span className="led-pulsing" style={{ background: 'var(--danger)' }}></span>
                  Local Simulated Mode
                </span>
              )}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Repository hiện tại: <strong style={{ color: 'var(--primary)' }}>{appliedRepo.owner}/{appliedRepo.name}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => fetchGitHubData(appliedRepo.owner, appliedRepo.name)}
            disabled={loading}
            title="Làm mới dữ liệu từ API"
          >
            <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
            <span>Làm mới</span>
          </button>
          
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowConfig(!showConfig)}
          >
            <Settings size={14} />
            <span>Cấu hình repo</span>
          </button>
        </div>
      </div>

      {/* Connection Config Form (Collapsible) */}
      {showConfig && (
        <form onSubmit={handleApplyConfig} className="glass-card" style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.2s ease-out' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--text-title)' }}>Cấu hình kết nối Repository</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label>Chủ sở hữu repo (Owner) *</label>
              <input
                type="text"
                className="form-control"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                placeholder="Ví dụ: vudanhdu2"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Tên Repository *</label>
              <input
                type="text"
                className="form-control"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="Ví dụ: aihot-vn"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>GitHub Personal Access Token (PAT) - Tùy chọn</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Giúp tăng giới hạn API từ 60 lên 5000 requests/giờ</span>
            </label>
            <input
              type="password"
              className="form-control"
              value={githubPat}
              onChange={(e) => setGithubPat(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowConfig(false)}>Huỷ</button>
            <button type="submit" className="btn btn-primary">Áp dụng</button>
          </div>
        </form>
      )}

      {/* Main Grid: Left side metrics, right side Webhook Console */}
      <div className="analytics-grid">
        
        {/* Left column: Commits & PRs list */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '620px' }}>
          {/* Sub tabs */}
          <div className="tab-container" style={{ marginBottom: '1rem' }}>
            <button 
              className={`tab-btn ${activeSubTab === 'commits' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('commits')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <GitCommit size={16} />
              <span>Dòng Commit ({commits.length})</span>
            </button>
            
            <button 
              className={`tab-btn ${activeSubTab === 'pulls' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('pulls')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <GitPullRequest size={16} />
              <span>Pull Requests ({pullRequests.length})</span>
            </button>
          </div>

          {/* List display */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
            {activeSubTab === 'commits' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {commits.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem' }}>
                    Không có commit nào được tìm thấy.
                  </div>
                ) : (
                  commits.map((commit, index) => {
                    const mapped = ctvGitMapping.find(m => m.gitUsername === commit.authorUsername);
                    return (
                      <div 
                        key={commit.sha + index}
                        style={{ 
                          display: 'flex', 
                          gap: '0.75rem', 
                          padding: '0.85rem',
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius-sm)',
                          transition: 'background var(--transition-fast)'
                        }}
                        className="hover-card-bg"
                      >
                        <img 
                          src={commit.avatarUrl} 
                          alt={commit.authorUsername}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid var(--border-color)' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text-title)' }}>
                              {commit.authorName} 
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '0.35rem' }}>
                                (@{commit.authorUsername})
                              </span>
                            </strong>
                            <a 
                              href={commit.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.72rem', color: 'var(--primary)' }}
                            >
                              <code>{commit.sha.substring(0, 7)}</code>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                          
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: '0.25rem 0', lineHeight: '1.4' }}>
                            {commit.message}
                          </p>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {new Date(commit.date).toLocaleDateString('vi-VN')} {new Date(commit.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            
                            {mapped ? (
                              <span className="badge badge-success" style={{ fontSize: '0.62rem', textTransform: 'none', padding: '0.15rem 0.4rem' }}>
                                CTV: {mapped.name}
                              </span>
                            ) : (
                              <span className="badge badge-danger" style={{ fontSize: '0.62rem', textTransform: 'none', padding: '0.15rem 0.4rem', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                                Hệ thống ngoài
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {pullRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem' }}>
                    Không có Pull Request nào.
                  </div>
                ) : (
                  pullRequests.map((pr) => {
                    const mapped = ctvGitMapping.find(m => m.gitUsername === pr.authorUsername);
                    return (
                      <div 
                        key={pr.id}
                        style={{ 
                          display: 'flex', 
                          gap: '0.75rem', 
                          padding: '0.85rem',
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--border-radius-sm)'
                        }}
                      >
                        <img 
                          src={pr.avatarUrl} 
                          alt={pr.authorUsername}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid var(--border-color)' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text-title)' }}>
                              Pull Request #{pr.number}
                            </strong>
                            
                            {pr.state === 'open' && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Open</span>}
                            {pr.state === 'closed' && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Closed</span>}
                            {pr.state === 'merged' && <span className="badge badge-info" style={{ fontSize: '0.65rem', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.25)' }}>Merged</span>}
                          </div>

                          <h5 style={{ fontSize: '0.85rem', fontWeight: '600', margin: '0.25rem 0', color: 'var(--text-main)' }}>
                            {pr.title}
                          </h5>

                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0' }}>
                            Mở bởi: <strong>@{pr.authorUsername}</strong> {mapped ? `(${mapped.name})` : ''}
                          </p>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '0.4rem' }}>
                            <a 
                              href={pr.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ fontSize: '0.75rem', textDecoration: 'underline', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              Xem mã nguồn đóng góp <ExternalLink size={10} />
                            </a>

                            {pr.state === 'open' && mapped && (
                              <button 
                                className="btn btn-success btn-sm"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                onClick={() => handleApproveContribution(pr.authorUsername, 200000, pr.number)}
                              >
                                <Award size={10} />
                                <span>Duyệt & Thưởng 200k</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Webhook Console & Leaderboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '620px' }}>
          
          {/* Cyberpunk Simulated Terminal */}
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#05070f', border: '1px solid #1f293d', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #111827', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                <Terminal size={16} />
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                  WEBHOOK EVENT TERMINAL
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }}></span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></span>
              </div>
            </div>

            {/* Console logs */}
            <div 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                fontFamily: 'monospace', 
                fontSize: '0.75rem', 
                lineHeight: '1.5',
                color: '#9ca3af',
                padding: '0.25rem'
              }}
            >
              {terminalLogs.map((log) => {
                let color = '#9ca3af';
                if (log.type === 'sys') color = '#6b7280';
                if (log.type === 'success') color = '#10b981';
                if (log.type === 'warning') color = '#f97316';
                if (log.type === 'error') color = '#ef4444';
                if (log.type === 'info') color = '#0ea5e9';

                return (
                  <div key={log.id} style={{ marginBottom: '0.45rem', wordBreak: 'break-all' }}>
                    <span style={{ color: '#4b5563', marginRight: '0.5rem' }}>[{log.time}]</span>
                    <span style={{ color }}>{log.text}</span>
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      {log.status && <span className={`badge ${log.status === 'mapped' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.58rem' }}>{log.status === 'mapped' ? 'Đã map' : 'Cần map thủ công'}</span>}
                      {log.ctvId && <span className="badge badge-info" style={{ fontSize: '0.58rem' }}>CTV #{log.ctvId}</span>}
                      {log.taskId && <span className="badge badge-info" style={{ fontSize: '0.58rem' }}>Task #{log.taskId}</span>}
                      {log.submissionId && <span className="badge badge-success" style={{ fontSize: '0.58rem' }}>Submission #{log.submissionId}</span>}
                    </div>
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>

            {/* Simulator triggers */}
            <div style={{ borderTop: '1px solid #111827', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: '600' }}>
                BỘ GIẢ LẬP WEBHOOK EVENTS (DEVELOPMENT ONLY):
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1f293d', color: '#0ea5e9', fontSize: '0.72rem' }}
                  onClick={simulatePushEvent}
                >
                  <Zap size={10} />
                  <span>Giả lập Push Commit</span>
                </button>

                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1f293d', color: '#10b981', fontSize: '0.72rem' }}
                  onClick={simulatePREvent}
                >
                  <GitPullRequest size={10} />
                  <span>Giả lập mở PR</span>
                </button>
              </div>
            </div>
          </div>

          {/* GitHub Contributors Leaderboard */}
          <div className="glass-card" style={{ height: '220px', display: 'flex', flexDirection: 'column', padding: '1rem 1.25rem' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-title)' }}>
              <Award size={16} style={{ color: 'var(--warning)' }} />
              Xếp hạng cống hiến code của CTV
            </h4>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ctvGitMapping.map((ctv, index) => {
                const ctvData = collaborators.find(c => c.id === ctv.ctvId);
                // Count commits and PRs from current lists
                const cCount = commits.filter(c => c.authorUsername === ctv.gitUsername).length;
                const pCount = pullRequests.filter(p => p.authorUsername === ctv.gitUsername).length;

                return (
                  <div 
                    key={ctv.ctvId}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: index === 0 ? 'var(--warning)' : 'var(--text-muted)', width: '16px' }}>
                        #{index + 1}
                      </span>
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-title)' }}>{ctv.name}</strong>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>github: @{ctv.gitUsername}</p>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>
                        <strong>{cCount}</strong> commits | <strong>{pCount}</strong> PRs
                      </span>
                      <p style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: '600' }}>
                        Ví: {ctvData ? ctvData.balance.toLocaleString() : 0}đ
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminGitTracker;
