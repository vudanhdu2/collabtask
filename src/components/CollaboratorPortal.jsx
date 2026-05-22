import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  CheckSquare, 
  Hourglass, 
  AlertCircle, 
  Send, 
  Globe, 
  Plus, 
  Landmark, 
  CreditCard, 
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  BookOpen,
  Download,
  Copy,
  FileText,
  Check,
  Lock,
  Scale,
  ChevronDown,
  ChevronUp,
  Terminal,
  Trophy,
  Search,
  SlidersHorizontal
} from 'lucide-react';
import Modal from './UI/Modal';
import { api } from '../services/api';

const CollaboratorPortal = ({ 
  activeTab, 
  setActiveTab,
  selectedCollaborator, 
  collaborators, 
  setCollaborators,
  tasks, 
  submissions, 
  setSubmissions,
  payouts, 
  setPayouts,
  triggerToast,
  onDataChange
}) => {
  const currentCtv = collaborators.find(c => c.id === selectedCollaborator) || collaborators[0];

  // Submission Form State
  const [submittingTask, setSubmittingTask] = useState(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState('overview');
  const [proofUrl, setProofUrl] = useState('');
  const [proofText, setProofText] = useState('');

  // Payout Form State
  const [bankName, setBankName] = useState('Techcombank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Guide & Terms Tab States
  const [activeAccordion, setActiveAccordion] = useState(0); // Default to Article 1 expanded
  const [kpiTicks, setKpiTicks] = useState({
    cleanCode: false,
    testCoverage: false,
    noSecrets: false,
    description: false
  });
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [downloadingGuide, setDownloadingGuide] = useState(false);
  const [downloadingTerms, setDownloadingTerms] = useState(false);

  // Leaderboard State
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Task Filters State
  const [taskAssignmentFilter, setTaskAssignmentFilter] = useState('all'); // 'all', 'mine', 'unassigned', 'others'
  const [taskPlatformFilter, setTaskPlatformFilter] = useState('all'); // 'all', 'GitHub / NodeJS', etc.
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskSortOrder, setTaskSortOrder] = useState('newest'); // 'newest', 'reward-desc', 'reward-asc'


  useEffect(() => {
    if (activeTab === 'leaderboard') {
      const fetchLeaderboard = async () => {
        setLoadingLeaderboard(true);
        try {
          const data = await api.collaborators.leaderboard();
          setLeaderboardData(data);
        } catch (err) {
          console.error(err);
          triggerToast('Không thể tải bảng xếp hạng!', 'danger');
        } finally {
          setLoadingLeaderboard(false);
        }
      };
      fetchLeaderboard();
    }
  }, [activeTab, collaborators]);

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
    triggerToast('Đã sao chép câu lệnh Git vào bộ nhớ tạm!', 'success');
  };

  const handleKpiToggle = (key) => {
    setKpiTicks(prev => {
      const next = { ...prev, [key]: !prev[key] };
      const checkedCount = Object.values(next).filter(Boolean).length;
      if (checkedCount === 4) {
        triggerToast('Tuyệt vời! Bạn đã tích đủ các chỉ số KPIs sẵn sàng nộp Pull Request!', 'success');
      }
      return next;
    });
  };

  const handleDownloadFile = async (filename, type) => {
    if (type === 'guide') setDownloadingGuide(true);
    else setDownloadingTerms(true);

    try {
      await api.docs.download(filename);
      triggerToast(`Tải xuống tài liệu ${filename} thành công!`, 'success');
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Lỗi tải xuống tài liệu', 'error');
    } finally {
      if (type === 'guide') setDownloadingGuide(false);
      else setDownloadingTerms(false);
    }
  };

  // Lấy giới hạn Cấp độ & EXP
  const getLevelInfoFrontend = (exp) => {
    const currentExp = Number(exp) || 0;
    if (currentExp < 500) {
      return { level: 1, maxJobs: 1, bonusPercent: 0, nextLevelExp: 500, prevLevelExp: 0 };
    } else if (currentExp < 1500) {
      return { level: 2, maxJobs: 2, bonusPercent: 5, nextLevelExp: 1500, prevLevelExp: 500 };
    } else if (currentExp < 3500) {
      return { level: 3, maxJobs: 3, bonusPercent: 10, nextLevelExp: 3500, prevLevelExp: 1500 };
    } else if (currentExp < 7500) {
      return { level: 4, maxJobs: 4, bonusPercent: 15, nextLevelExp: 7500, prevLevelExp: 3500 };
    } else {
      return { level: 5, maxJobs: 5, bonusPercent: 20, nextLevelExp: null, prevLevelExp: 7500 };
    }
  };

  const handleAcceptTask = async (taskId) => {
    try {
      const res = await api.tasks.accept(taskId);
      triggerToast(res.message || 'Nhận nhiệm vụ thành công!', 'success');
      if (onDataChange) {
        await onDataChange();
      }
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Lỗi khi nhận nhiệm vụ.', 'danger');
    }
  };

  const handleCancelTask = async (taskId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy nhận nhiệm vụ này? Nhiệm vụ sẽ quay lại kho chung để CTV khác có thể nhận.')) {
      return;
    }
    try {
      const res = await api.tasks.cancel(taskId);
      triggerToast(res.message || 'Đã hủy nhận nhiệm vụ thành công!', 'success');
      if (onDataChange) {
        await onDataChange();
      }
    } catch (err) {
      console.error(err);
      triggerToast(err.message || 'Lỗi khi hủy nhận nhiệm vụ.', 'danger');
    }
  };

  const handleDownloadTaskMarkdown = (task, computed) => {
    if (!task) return;
    const { kpis, techReqs, instructions, mySub } = computed;

    const subStatusStr = mySub 
      ? (mySub.status === 'approved' ? 'Đã hoàn thành & giải ngân' : mySub.status === 'pending' ? 'Đang chờ duyệt' : 'Bị từ chối')
      : 'Chưa nộp báo cáo';

    const mySubSection = mySub ? `
## 7. Trạng thái báo cáo của bạn
- **Trạng thái:** ${subStatusStr}
- **Thời gian nộp:** ${new Date(mySub.submittedAt).toLocaleString('vi-VN')}
- **GitHub PR Link:** ${mySub.proofUrl}
${mySub.proofText ? `- **Ghi chú CTV:** "${mySub.proofText}"` : ''}
${mySub.rejectReason ? `- **Lý do từ chối:** "${mySub.rejectReason}"` : ''}
` : `
## 7. Trạng thái báo cáo của bạn
- **Trạng thái:** Chưa nộp báo cáo.
`;

    const markdownContent = `# [Nhiệm vụ] ${task.title}

## 1. Thông tin chung
- **Nền tảng / Công nghệ:** ${task.platform}
- **Quy mô:** Lập trình (Có kèm KPIs & Tiêu chí nghiệm thu)
- **Thù lao cố định:** ${task.reward.toLocaleString()}đ
- **Hạn chót:** ${new Date(task.deadline).toLocaleDateString('vi-VN')}
- **Trạng thái:** ${task.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}

## 2. Mô tả công việc
${task.description || 'Chưa có mô tả cụ thể.'}

## 3. Yêu cầu nộp bằng chứng
${task.requirements || 'Chưa có yêu cầu cụ thể.'}

## 4. Chỉ số KPIs & Tiêu chí nghiệm thu
${kpis.map((kpi) => `- [ ] ${kpi}`).join('\n')}

## 5. Yêu cầu kỹ thuật chi tiết
${techReqs.map(req => `- ${req}`).join('\n')}

## 6. Hướng dẫn thực hiện & Git Workflow
${instructions.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}
${mySubSection}
---
*Tài liệu được xuất bản tự động dưới dạng Markdown tối ưu cho các AI Coding Agents đọc hiểu cấu trúc dự án và thực hiện lập trình.*
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Clean title for filename
    const cleanTitle = task.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove tone marks
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9_-]/g, '_') // replace non-alphanumeric with underscores
      .replace(/_+/g, '_') // collapse multiple underscores
      .trim();
      
    link.download = `nhiem_vu_${cleanTitle || 'details'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    triggerToast('Tải tài liệu MD thành công!', 'success');
  };

  // 1. Task Submission logic
  const handleOpenSubmitModal = (task) => {
    setSubmittingTask(task);
    setProofUrl('');
    setProofText('');
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!proofUrl.trim() || !proofUrl.startsWith('http')) {
      triggerToast('Vui lòng nhập link bằng chứng hợp lệ (bắt đầu bằng http)!', 'danger');
      return;
    }

    try {
      await api.submissions.create({
        ctvId: currentCtv.id,
        taskId: submittingTask.id,
        reward: submittingTask.reward,
        proofUrl: proofUrl.trim(),
        proofText: proofText.trim()
      });
      triggerToast('Nộp báo cáo nhiệm vụ thành công! Vui lòng chờ Admin phê duyệt.', 'success');
      if (onDataChange) {
        await onDataChange();
      }
      setSubmittingTask(null);
    } catch (err) {
      triggerToast(err.message || 'Lỗi khi nộp báo cáo nhiệm vụ!', 'danger');
    }
  };

  // 2. Withdrawal request logic
  const handleWithdrawRequest = async (e) => {
    e.preventDefault();
    const amount = parseInt(withdrawAmount);
    
    if (isNaN(amount) || amount < 100000) {
      triggerToast('Số tiền rút tối thiểu là 100,000đ!', 'warning');
      return;
    }
    if (amount > currentCtv.balance) {
      triggerToast('Số dư ví không đủ để rút số tiền này!', 'danger');
      return;
    }
    if (!accountNumber.trim() || !accountHolder.trim()) {
      triggerToast('Vui lòng nhập đầy đủ thông tin tài khoản!', 'danger');
      return;
    }

    try {
      await api.payouts.create({
        ctvId: currentCtv.id,
        amount,
        bankName,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.toUpperCase().trim()
      });

      triggerToast(`Đã gửi yêu cầu rút ${amount.toLocaleString()}đ. Chờ Admin xử lý!`, 'success');
      if (onDataChange) {
        await onDataChange();
      }
      
      // Clear Form
      setWithdrawAmount('');
      setAccountNumber('');
      setAccountHolder('');
    } catch (err) {
      triggerToast(err.message || 'Lỗi khi gửi yêu cầu rút tiền!', 'danger');
    }
  };

  // Filter lists based on selected CTV
  const mySubmissions = submissions.filter(s => s.ctvId === currentCtv.id);
  const myPayouts = payouts.filter(p => p.ctvId === currentCtv.id);
  
  // Calculate specific stats
  const completedCount = mySubmissions.filter(s => s.status === 'approved').length;
  const pendingCount = mySubmissions.filter(s => s.status === 'pending').length;
  const rejectedCount = mySubmissions.filter(s => s.status === 'rejected').length;
  
  const totalEarnings = mySubmissions
    .filter(s => s.status === 'approved')
    .reduce((sum, s) => sum + s.reward, 0);

  const totalWithdrawn = myPayouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  // Render Portal Dashboard
  const renderDashboard = () => {
    const levelInfo = getLevelInfoFrontend(currentCtv?.exp || 0);
    const currentExp = currentCtv?.exp || 0;
    const level = levelInfo.level;
    const nextLevelExp = levelInfo.nextLevelExp;
    const prevLevelExp = levelInfo.prevLevelExp;
    
    // Calculate percentage
    let progressPercentage = 100;
    if (nextLevelExp !== null) {
      const range = nextLevelExp - prevLevelExp;
      const progress = currentExp - prevLevelExp;
      progressPercentage = Math.min(100, Math.max(0, (progress / range) * 100));
    }

    return (
      <div>
        {/* Level & EXP Gaming Widget */}
        <div className="glass-card" style={{ 
          marginBottom: '2rem', 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.15) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(168, 85, 247, 0.1)',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '1.6rem',
                boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
                border: '2px solid rgba(255, 255, 255, 0.2)'
              }}>
                {level}
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, #ffffff, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Cấp độ {level}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                  Quyền lợi: Nhận tối đa <strong>{levelInfo.maxJobs} việc</strong> cùng lúc & Thưởng thêm <strong>+{levelInfo.bonusPercent}%</strong> thù lao
                </p>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '600' }}>
                {currentExp.toLocaleString()} <span style={{ color: 'var(--text-muted)' }}>/ {nextLevelExp !== null ? `${nextLevelExp.toLocaleString()} EXP` : 'MAX'}</span>
              </span>
              {nextLevelExp !== null && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Còn {(nextLevelExp - currentExp).toLocaleString()} EXP để thăng cấp tiếp theo
                </p>
              )}
            </div>
          </div>
          
          {/* Exp Progress Bar */}
          <div style={{
            width: '100%',
            height: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '5px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative'
          }}>
            <div style={{
              width: `${progressPercentage}%`,
              height: '100%',
              background: 'linear-gradient(to right, var(--primary), #a855f7, #ec4899)',
              borderRadius: '5px',
              boxShadow: '0 0 10px rgba(168, 85, 247, 0.8)',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </div>
        </div>

        {/* KPI Stats */}
        <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
            <Wallet size={24} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Số Dư Khả Dụng</p>
            <h3 className="kpi-value">{currentCtv?.balance.toLocaleString()}đ</h3>
            <span className="kpi-trend" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Rút tối thiểu 100,000đ
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Đã Duyệt (Thu nhập)</p>
            <h3 className="kpi-value">{totalEarnings.toLocaleString()}đ</h3>
            <span className="kpi-trend up">
              <span>Đã hoàn thành {completedCount} việc</span>
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <Hourglass size={24} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Đang Chờ Duyệt</p>
            <h3 className="kpi-value">{pendingCount} việc</h3>
            <span className="kpi-trend" style={{ color: 'var(--warning)' }}>
              Đang chờ Admin chấm điểm
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <XCircle size={24} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Bị Từ Chối</p>
            <h3 className="kpi-value">{rejectedCount} việc</h3>
            <span className="kpi-trend" style={{ color: 'var(--danger)' }}>
              Cần chỉnh sửa lại bằng chứng
            </span>
          </div>
        </div>
      </div>

      {/* Guide Card & Recent Tasks */}
      <div className="responsive-grid">
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            💻 Quy trình Lập trình & Git Workflow
          </h3>
          <div style={{ fontSize: '0.85rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.65rem', color: 'var(--text-main)' }}>
            <p>1. Chọn các nhiệm vụ trong mục <strong>Nhiệm vụ làm việc</strong> và đọc kỹ các chỉ số <strong>KPIs chất lượng</strong>.</p>
            <p>2. Tiến hành <strong>Fork & Clone</strong> repository chính của dự án về tài khoản cá nhân.</p>
            <p>3. Tạo nhánh mới dạng <code>feature/task-[ID]-[tên]</code>, lập trình và viết unit tests đầy đủ.</p>
            <p>4. Đẩy code lên repository cá nhân và tạo <strong>Pull Request (PR)</strong> hướng về nhánh main của repo chính.</p>
            <p>5. Bấm <strong>"Nộp báo cáo"</strong>, dán link Pull Request để hệ thống ghi nhận, chờ Admin review và nhận tiền thưởng về Ví!</p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => setActiveTab('my-tasks')}
            style={{ marginTop: '1.25rem', width: '100%' }}
          >
            Nhận nhiệm vụ lập trình ngay
          </button>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Lịch sử báo cáo gần đây</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mySubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                Bạn chưa nộp báo cáo nào!
              </div>
            ) : (
              mySubmissions.slice(0, 4).map((sub) => {
                const task = tasks.find(t => t.id === sub.taskId);
                return (
                  <div 
                    key={sub.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      paddingBottom: '0.75rem',
                      borderBottom: '1px solid var(--border-color)'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-title)' }}>{task ? task.title : 'Nhiệm vụ'}</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Nộp ngày: {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <div>
                      {sub.status === 'pending' && <span className="badge badge-warning">Chờ duyệt</span>}
                      {sub.status === 'approved' && <span className="badge badge-success">+{sub.reward.toLocaleString()}đ</span>}
                      {sub.status === 'rejected' && <span className="badge badge-danger">Từ chối</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

  // Render Tasks Board
  const renderTasks = () => {
    // Only active tasks
    const allActiveTasks = tasks.filter(t => t.status === 'active');
    
    // Auto extract unique platforms from active tasks
    const platforms = ['all', ...new Set(allActiveTasks.map(t => t.platform))];

    // Filter tasks
    let activeTasks = allActiveTasks;

    // 1. Search Query Filter
    if (taskSearchQuery.trim() !== '') {
      const query = taskSearchQuery.toLowerCase();
      activeTasks = activeTasks.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.description.toLowerCase().includes(query) || 
        (t.platform && t.platform.toLowerCase().includes(query))
      );
    }

    // 2. Assignment Status Filter
    if (taskAssignmentFilter !== 'all') {
      activeTasks = activeTasks.filter(t => {
        const isMine = t.assignedCtvId === currentCtv?.id;
        const isOthers = t.assignedCtvId !== null && t.assignedCtvId !== undefined && t.assignedCtvId !== currentCtv?.id;
        const isUnassigned = t.assignedCtvId === null || t.assignedCtvId === undefined;

        if (taskAssignmentFilter === 'mine') return isMine;
        if (taskAssignmentFilter === 'unassigned') return isUnassigned;
        if (taskAssignmentFilter === 'others') return isOthers;
        return true;
      });
    }

    // 3. Platform Filter
    if (taskPlatformFilter !== 'all') {
      activeTasks = activeTasks.filter(t => t.platform === taskPlatformFilter);
    }

    // 4. Sort Order
    activeTasks = [...activeTasks].sort((a, b) => {
      if (taskSortOrder === 'reward-desc') {
        return b.reward - a.reward;
      } else if (taskSortOrder === 'reward-asc') {
        return a.reward - b.reward;
      } else {
        // newest - default
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        if (dateB - dateA !== 0) return dateB - dateA;
        return b.id - a.id;
      }
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Advanced Glassmorphism Filter Bar */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          {/* Main search and dropdowns controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            {/* Search Input Box */}
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm nhiệm vụ theo tiêu đề, mô tả hoặc công nghệ..."
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', height: '42px', borderRadius: '10px' }}
              />
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '0.85rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              {taskSearchQuery && (
                <button
                  onClick={() => setTaskSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Platform Technology Dropdown */}
            <div style={{ minWidth: '180px', flex: '0 1 auto' }}>
              <select
                className="form-control"
                value={taskPlatformFilter}
                onChange={(e) => setTaskPlatformFilter(e.target.value)}
                style={{ 
                  height: '42px',
                  borderRadius: '10px',
                  appearance: 'none', 
                  WebkitAppearance: 'none', 
                  backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a1a1aa\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.25rem',
                  paddingRight: '2rem'
                }}
              >
                <option value="all">📁 Tất cả công nghệ</option>
                {platforms.filter(p => p !== 'all').map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>

            {/* Sorting Dropdown */}
            <div style={{ minWidth: '180px', flex: '0 1 auto' }}>
              <select
                className="form-control"
                value={taskSortOrder}
                onChange={(e) => setTaskSortOrder(e.target.value)}
                style={{ 
                  height: '42px',
                  borderRadius: '10px',
                  appearance: 'none', 
                  WebkitAppearance: 'none', 
                  backgroundImage: 'url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a1a1aa\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.75rem center',
                  backgroundSize: '1.25rem',
                  paddingRight: '2rem'
                }}
              >
                <option value="newest">🕒 Mới nhất</option>
                <option value="reward-desc">💰 Thù lao: Cao → Thấp</option>
                <option value="reward-asc">💸 Thù lao: Thấp → Cao</option>
              </select>
            </div>
          </div>

          {/* Quick status filter chips row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}>
              <SlidersHorizontal size={14} style={{ marginRight: '0.35rem' }} /> Trạng thái gán việc:
            </span>
            {[
              { id: 'all', label: 'Tất cả nhiệm vụ', count: allActiveTasks.length },
              { id: 'mine', label: 'Nhiệm vụ đang làm của tôi', count: allActiveTasks.filter(t => t.assignedCtvId === currentCtv?.id).length },
              { id: 'unassigned', label: 'Chưa ai nhận', count: allActiveTasks.filter(t => t.assignedCtvId === null || t.assignedCtvId === undefined).length },
              { id: 'others', label: 'Cộng tác viên khác đang nhận', count: allActiveTasks.filter(t => t.assignedCtvId !== null && t.assignedCtvId !== undefined && t.assignedCtvId !== currentCtv?.id).length }
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => setTaskAssignmentFilter(chip.id)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: '500',
                  background: taskAssignmentFilter === chip.id 
                    ? 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)' 
                    : 'rgba(255, 255, 255, 0.04)',
                  color: taskAssignmentFilter === chip.id ? '#ffffff' : 'var(--text-muted)',
                  border: '1px solid ' + (taskAssignmentFilter === chip.id ? 'transparent' : 'rgba(255, 255, 255, 0.08)'),
                  transition: 'all var(--transition-fast)',
                  boxShadow: taskAssignmentFilter === chip.id ? '0 4px 12px rgba(99, 102, 241, 0.25)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>{chip.label}</span>
                <span style={{ 
                  background: taskAssignmentFilter === chip.id ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  padding: '0.05rem 0.35rem',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  color: taskAssignmentFilter === chip.id ? '#ffffff' : 'var(--text-main)'
                }}>{chip.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tasks Grid List */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {activeTasks.length === 0 ? (
            <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc đã chọn!
            </div>
          ) : (
            activeTasks.map((task) => {
              const hasSubmitted = mySubmissions.some(s => s.taskId === task.id && s.status === 'pending');
              const hasApproved = mySubmissions.some(s => s.taskId === task.id && s.status === 'approved');
              const hasRejected = mySubmissions.some(s => s.taskId === task.id && s.status === 'rejected');

              const isAssignedToMe = task.assignedCtvId === currentCtv?.id;
              const isAssignedToOther = task.assignedCtvId !== null && task.assignedCtvId !== undefined && task.assignedCtvId !== currentCtv?.id;
              const isUnassigned = task.assignedCtvId === null || task.assignedCtvId === undefined;
              const assignedCtvName = isAssignedToOther ? (collaborators.find(c => c.id === task.assignedCtvId)?.name || 'CTV khác') : '';

              return (
                <div 
                  key={task.id} 
                  className="glass-card hover-effect" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    cursor: 'pointer',
                    opacity: isAssignedToOther ? 0.75 : 1,
                    border: isAssignedToMe ? '1px solid rgba(16, 185, 129, 0.35)' : (isAssignedToOther ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid var(--border-color)'),
                    boxShadow: isAssignedToMe ? '0 8px 32px rgba(16, 185, 129, 0.06)' : 'none'
                  }}
                  onClick={() => { setSelectedTaskDetails(task); setActiveDetailsTab('overview'); }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="badge badge-info">{task.platform}</span>
                      {isAssignedToMe && (
                        <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.72rem' }}>
                          Đang làm
                        </span>
                      )}
                      {isAssignedToOther && (
                        <span className="badge badge-secondary" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.72rem' }}>
                          🔒 Đã có người nhận
                        </span>
                      )}
                    </div>
                    <strong style={{ color: 'var(--success)', fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                      {task.reward.toLocaleString()}đ
                    </strong>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.5rem', color: isAssignedToOther ? 'var(--text-muted)' : 'var(--text-title)' }}>
                    {task.title}
                  </h3>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.25rem', flex: 1 }}>
                    {task.description}
                  </p>

                  <div 
                    style={{ 
                      borderTop: '1px solid var(--border-color)', 
                      paddingTop: '1rem', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Hạn: {new Date(task.deadline).toLocaleDateString('vi-VN')}
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                      <span 
                        style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600', marginRight: '0.25rem' }}
                      >
                        Chi tiết →
                      </span>
                      
                      {isAssignedToOther ? (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }} title={`Được nhận bởi ${assignedCtvName}`}>
                          <span>Bởi: <strong>{assignedCtvName}</strong></span>
                        </span>
                      ) : isAssignedToMe ? (
                        <>
                          {hasApproved ? (
                            <span className="badge badge-success">Đã hoàn thành</span>
                          ) : hasSubmitted ? (
                            <span className="badge badge-warning">Đang chờ duyệt</span>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button 
                                className="btn btn-sm" 
                                style={{ 
                                  background: 'rgba(239, 68, 68, 0.12)', 
                                  color: '#f87171', 
                                  border: '1px solid rgba(239, 68, 68, 0.25)', 
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '6px'
                                }} 
                                onClick={() => handleCancelTask(task.id)}
                              >
                                Hủy nhận
                              </button>
                              <button 
                                className="btn btn-primary btn-sm" 
                                style={{ 
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                                  border: 'none', 
                                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                                  color: '#ffffff',
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '6px'
                                }}
                                onClick={() => handleOpenSubmitModal(task)}
                              >
                                Nộp báo cáo
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <button 
                          className="btn btn-primary btn-sm" 
                          style={{ 
                            background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)', 
                            border: 'none', 
                            boxShadow: '0 4px 12px rgba(168, 85, 247, 0.2)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px'
                          }}
                          onClick={() => handleAcceptTask(task.id)}
                        >
                          Nhận việc
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Render Submissions Table
  const renderSubmissions = () => (
    <div className="glass-card">
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nhiệm vụ</th>
              <th>Tiền thưởng</th>
              <th>Thời gian nộp</th>
              <th>Link bằng chứng</th>
              <th>Trạng thái</th>
              <th>Ghi chú phản hồi</th>
            </tr>
          </thead>
          <tbody>
            {mySubmissions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  Bạn chưa nộp bất kỳ báo cáo nhiệm vụ nào!
                </td>
              </tr>
            ) : (
              mySubmissions.map((sub) => {
                const task = tasks.find(t => t.id === sub.taskId);

                return (
                  <tr key={sub.id}>
                    <td>
                      <strong style={{ color: 'var(--text-title)', fontSize: '0.85rem' }}>
                        {task ? task.title : 'Nhiệm vụ đã bị xóa'}
                      </strong>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Kênh: {task ? task.platform : ''}
                      </p>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--success)' }}>
                      {sub.reward.toLocaleString()}đ
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {new Date(sub.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      <a href={sub.proofUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', textDecoration: 'underline' }}>
                        Xem Link
                      </a>
                    </td>
                    <td>
                      {sub.status === 'pending' && <span className="badge badge-warning">Chờ duyệt</span>}
                      {sub.status === 'approved' && <span className="badge badge-success">Thành công</span>}
                      {sub.status === 'rejected' && <span className="badge badge-danger">Bị từ chối</span>}
                    </td>
                    <td>
                      {sub.status === 'rejected' ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span>Lý do: <strong>{sub.rejectReason}</strong></span>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            onClick={() => handleOpenSubmitModal(task)}
                            style={{ alignSelf: 'flex-start', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                          >
                            Nộp lại
                          </button>
                        </div>
                      ) : sub.status === 'approved' ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Đã cộng tiền</span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Đang đợi đối soát</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Wallet & Payout requests
  const renderWallet = () => (
    <div className="analytics-grid" style={{ alignItems: 'flex-start' }}>
      {/* Withdrawal Form */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Landmark size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.1rem' }}>Tạo yêu cầu rút tiền</h3>
        </div>

        <form onSubmit={handleWithdrawRequest}>
          <div className="form-group">
            <label>Chọn Ngân hàng nhận *</label>
            <select
              className="form-control"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            >
              <option value="Techcombank">Techcombank (Kỹ Thương)</option>
              <option value="Vietcombank">Vietcombank (Ngoại Thương)</option>
              <option value="MB Bank">MB Bank (Quân Đội)</option>
              <option value="ACB">ACB (Á Châu)</option>
              <option value="BIDV">BIDV (Đầu Tư Phát Triển)</option>
              <option value="Viettinbank">Viettinbank (Công Thương)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Số tài khoản nhận tiền *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Nhập số tài khoản nhận tiền..."
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Tên chủ tài khoản (Không dấu) *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ví dụ: NGUYEN VAN A"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Số tiền muốn rút (VNĐ) *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                className="form-control"
                placeholder="Nhập số tiền muốn rút..."
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="100000"
                step="50000"
                required
              />
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                VNĐ
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Số dư hiện tại: <strong>{currentCtv?.balance.toLocaleString()}đ</strong>
            </p>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
            <Send size={16} />
            <span>Gửi yêu cầu thanh toán</span>
          </button>
        </form>
      </div>

      {/* Payouts History list */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <ArrowRightLeft size={20} style={{ color: 'var(--success)' }} />
          <h3 style={{ fontSize: '1.1rem' }}>Lịch sử giao dịch rút tiền</h3>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ngân hàng nhận</th>
                <th>Số tiền rút</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th>Mã GD / Phản hồi</th>
              </tr>
            </thead>
            <tbody>
              {myPayouts.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    Bạn chưa thực hiện giao dịch rút tiền nào!
                  </td>
                </tr>
              ) : (
                myPayouts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong style={{ color: 'var(--text-title)', fontSize: '0.85rem' }}>{p.bankName}</strong>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.accountNumber}</p>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--danger)' }}>
                      -{p.amount.toLocaleString()}đ
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {new Date(p.requestedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      {p.status === 'pending' && <span className="badge badge-warning">Đang duyệt</span>}
                      {p.status === 'paid' && <span className="badge badge-success">Thành công</span>}
                      {p.status === 'rejected' && <span className="badge badge-danger">Từ chối</span>}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {p.status === 'paid' && (
                        <span>Mã GD: <strong>{p.transactionId}</strong></span>
                      )}
                      {p.status === 'rejected' && (
                        <span style={{ color: 'var(--danger)' }}>Lý do: <strong>{p.rejectReason}</strong></span>
                      )}
                      {p.status === 'pending' && (
                        <span style={{ color: 'var(--text-muted)' }}>Đang xử lý bút toán</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderGuideTerms = () => {
    const completedTicksCount = Object.values(kpiTicks).filter(Boolean).length;
    const progressPercent = completedTicksCount * 25;

    // Helper for rendering progress bar color dynamically
    const getProgressBarColor = () => {
      if (progressPercent === 0) return 'rgba(239, 68, 68, 0.4)';
      if (progressPercent === 25) return 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)';
      if (progressPercent === 50) return 'linear-gradient(90deg, #f97316 0%, #eab308 100%)';
      if (progressPercent === 75) return 'linear-gradient(90deg, #eab308 0%, #6366f1 100%)';
      return 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)';
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Premium Hero Header */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '2.5rem 2rem', 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)', 
            border: '1px solid rgba(99, 102, 241, 0.3)', 
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', filter: 'blur(50px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.2)', filter: 'blur(50px)', pointerEvents: 'none' }} />
          
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-title)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            📋 Hướng Dẫn Kỹ Thuật & Quy Chế Làm Việc
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '720px', margin: '0 auto', lineHeight: '1.6' }}>
            Chào mừng bạn đến với CollabTask. Hãy đọc kỹ quy trình chuẩn hóa Git Workflow và các điều khoản pháp lý nghiêm ngặt dưới đây để đảm bảo việc nghiệm thu diễn ra nhanh chóng, bảo mật và sòng phẳng.
          </p>
        </div>

        {/* Dynamic Download Center */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '1.5rem', 
            background: 'rgba(255, 255, 255, 0.01)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-title)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} style={{ color: 'var(--primary)' }} />
            Trung tâm Tải xuống Tài liệu gốc (Download Center)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            
            {/* Guide Download Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '6px' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-title)' }}>HUONG_DAN.md</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hướng dẫn lập trình chi tiết</span>
                </div>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '6px' }}
                onClick={() => handleDownloadFile('HUONG_DAN.md', 'guide')}
                disabled={downloadingGuide}
              >
                {downloadingGuide ? (
                  <span className="spinner" style={{ width: '12px', height: '12px' }}></span>
                ) : (
                  <Download size={14} />
                )}
                Tải về .MD
              </button>
            </div>

            {/* Terms Download Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', padding: '0.5rem', borderRadius: '6px' }}>
                  <Scale size={20} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-title)' }}>DIEU_KHOAN.md</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quy chế & NDA bảo mật</span>
                </div>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '6px', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', background: 'rgba(168,85,247,0.05)' }}
                onClick={() => handleDownloadFile('DIEU_KHOAN.md', 'terms')}
                disabled={downloadingTerms}
              >
                {downloadingTerms ? (
                  <span className="spinner" style={{ width: '12px', height: '12px', borderColor: '#a855f7 transparent #a855f7 transparent' }}></span>
                ) : (
                  <Download size={14} />
                )}
                Tải về .MD
              </button>
            </div>

          </div>
        </div>

        {/* Two Column Layout */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', 
            gap: '2rem',
            alignItems: 'stretch'
          }}
        >
          
          {/* Left Column: Hướng dẫn người mới (Newcomer Guide) */}
          <div 
            className="glass-card" 
            style={{ 
              padding: '2rem', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '8px', display: 'flex' }}>
                <BookOpen size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-title)', margin: 0 }}>
                💻 Lập trình chuẩn Git & Quy trình nộp bài
              </h3>
            </div>

            {/* Interactive Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
              
              {/* Vertical line connector */}
              <div style={{ position: 'absolute', left: '14px', top: '15px', bottom: '15px', width: '2px', background: 'linear-gradient(180deg, var(--primary) 0%, rgba(99, 102, 241, 0.2) 100%)', zIndex: 0 }}></div>

              {/* Step 1 */}
              <div style={{ display: 'flex', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 0 10px rgba(99,102,241,0.5)' }}>1</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--text-title)', marginBottom: '0.25rem' }}>Chọn nhiệm vụ & Phân tích KPIs</strong>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', display: 'block' }}>
                    Chọn nhiệm vụ lập trình phù hợp. Đọc kỹ mô tả công việc, các yêu cầu kỹ thuật và đặc biệt là checklist KPIs bắt buộc để tránh code bị trả về.
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 0 10px rgba(99,102,241,0.5)' }}>2</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--text-title)', marginBottom: '0.25rem' }}>Fork & Clone Repository</strong>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', display: 'block', marginBottom: '0.5rem' }}>
                    Nhấn <strong>Fork</strong> dự án chính trên GitHub về tài khoản của bạn, sau đó sao chép (clone) mã nguồn về máy local để làm việc.
                  </span>
                  
                  {/* CLI Command Container */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontFamily: 'monospace', fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                      <Terminal size={12} style={{ flexShrink: 0 }} />
                      <span>git clone https://github.com/your-username/project.git</span>
                    </div>
                    <button 
                      style={{ background: 'transparent', border: 'none', color: copiedIndex === 1 ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                      onClick={() => handleCopyCode('git clone https://github.com/your-username/project.git', 1)}
                      title="Sao chép lệnh"
                    >
                      {copiedIndex === 1 ? <CheckSquare size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 0 10px rgba(99,102,241,0.5)' }}>3</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--text-title)', marginBottom: '0.25rem' }}>Lập trình trên Nhánh mới (Branching)</strong>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', display: 'block', marginBottom: '0.5rem' }}>
                    Không code đè trên `main`. Phải checkout sang branch mới: <code>feature/task-[ID]-[tên]</code> hoặc <code>bugfix/task-[ID]-[tên]</code>. Lập trình sạch và viết Unit Tests.
                  </span>
                  
                  {/* CLI Command Container */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontFamily: 'monospace', fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                      <Terminal size={12} style={{ flexShrink: 0 }} />
                      <span>git checkout -b feature/task-102-auth-jwt</span>
                    </div>
                    <button 
                      style={{ background: 'transparent', border: 'none', color: copiedIndex === 2 ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                      onClick={() => handleCopyCode('git checkout -b feature/task-102-auth-jwt', 2)}
                      title="Sao chép lệnh"
                    >
                      {copiedIndex === 2 ? <CheckSquare size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div style={{ display: 'flex', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 0 10px rgba(99,102,241,0.5)' }}>4</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--text-title)', marginBottom: '0.25rem' }}>Commit & Push theo Chuẩn (Conventional)</strong>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', display: 'block', marginBottom: '0.5rem' }}>
                    Đặt tên commit đúng quy chuẩn: <code>feat(...)</code> hoặc <code>fix(...)</code>, sau đó push nhánh lên repo GitHub cá nhân của bạn.
                  </span>
                  
                  {/* CLI Command Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontFamily: 'monospace', fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                        <Terminal size={12} style={{ flexShrink: 0 }} />
                        <span>git commit -m "feat(auth): add JWT login API"</span>
                      </div>
                      <button 
                        style={{ background: 'transparent', border: 'none', color: copiedIndex === 3 ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                        onClick={() => handleCopyCode('git commit -m "feat(auth): add JWT login API"', 3)}
                        title="Sao chép lệnh"
                      >
                        {copiedIndex === 3 ? <CheckSquare size={14} /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontFamily: 'monospace', fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                        <Terminal size={12} style={{ flexShrink: 0 }} />
                        <span>git push origin feature/task-102-auth-jwt</span>
                      </div>
                      <button 
                        style={{ background: 'transparent', border: 'none', color: copiedIndex === 4 ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}
                        onClick={() => handleCopyCode('git push origin feature/task-102-auth-jwt', 4)}
                        title="Sao chép lệnh"
                      >
                        {copiedIndex === 4 ? <CheckSquare size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div style={{ display: 'flex', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 0 10px rgba(99,102,241,0.5)' }}>5</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--text-title)', marginBottom: '0.25rem' }}>Tạo Pull Request & Nộp báo cáo CollabTask</strong>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', display: 'block' }}>
                    Tạo <strong>Pull Request</strong> trên GitHub trỏ về repo gốc của CollabTask. Sao chép URL của PR này, dán vào ô báo cáo của nhiệm vụ trên Portal và gửi đi. Admin sẽ đối soát và giải ngân tự động trong 24-48 giờ.
                  </span>
                </div>
              </div>

            </div>

            {/* Interactive KPI Self-Checklist */}
            <div 
              style={{ 
                background: 'rgba(99,102,241,0.03)', 
                border: '1px solid rgba(99, 102, 241, 0.15)', 
                padding: '1.25rem', 
                borderRadius: '10px',
                marginTop: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', fontWeight: '700', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🛡️ Bảng tự rà soát KPIs (Self-Checklist)
                </h4>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: progressPercent === 100 ? 'var(--success)' : 'var(--primary)' }}>
                  {progressPercent}% Hoàn tất
                </span>
              </div>
              
              {/* Progress Bar */}
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginBottom: '1rem', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${progressPercent}%`, 
                    height: '100%', 
                    background: getProgressBarColor(), 
                    transition: 'width 0.4s ease-in-out, background 0.4s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                  <input 
                    type="checkbox" 
                    checked={kpiTicks.cleanCode} 
                    onChange={() => handleKpiToggle('cleanCode')}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span><strong>Clean Code:</strong> Mã nguồn sạch, chạy linter lọt 100%, không lỗi cú pháp.</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                  <input 
                    type="checkbox" 
                    checked={kpiTicks.testCoverage} 
                    onChange={() => handleKpiToggle('testCoverage')}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span><strong>Unit Tests:</strong> Viết kiểm thử tự động, Test Coverage đạt tối thiểu 80%.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                  <input 
                    type="checkbox" 
                    checked={kpiTicks.noSecrets} 
                    onChange={() => handleKpiToggle('noSecrets')}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span><strong>Bảo mật:</strong> Tuyệt đối không commit Secrets/Tokens (.env trong .gitignore).</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                  <input 
                    type="checkbox" 
                    checked={kpiTicks.description} 
                    onChange={() => handleKpiToggle('description')}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <span><strong>Pull Request:</strong> Mô tả rõ ràng giải pháp, tóm tắt các tệp thay đổi.</span>
                </label>
              </div>

              {progressPercent === 100 && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', textAlign: 'center', animation: 'pulse 2s infinite' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={14} /> Bạn đã sẵn sàng nộp Pull Request tối ưu KPIs!
                  </span>
                </div>
              )}

            </div>
          </div>

          {/* Right Column: Điều khoản làm việc (Terms of Work - Accordion Style) */}
          <div 
            className="glass-card" 
            style={{ 
              padding: '2rem', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '0.5rem', borderRadius: '8px', display: 'flex' }}>
                <Scale size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-title)', margin: 0 }}>
                ⚖️ Quy chế Pháp lý & Điều khoản bảo mật
              </h3>
            </div>

            {/* Accordion List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Accordion Item 1 */}
              <div 
                style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  background: activeAccordion === 0 ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                  borderLeft: activeAccordion === 0 ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setActiveAccordion(activeAccordion === 0 ? null : 0)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <BookOpen size={16} style={{ color: activeAccordion === 0 ? 'var(--primary)' : 'var(--text-muted)' }} />
                    <strong style={{ fontSize: '0.85rem', color: activeAccordion === 0 ? 'var(--text-title)' : 'var(--text-main)' }}>
                      Điều 1: Sở hữu Trí tuệ và Bản quyền mã nguồn
                    </strong>
                  </div>
                  {activeAccordion === 0 ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
                
                {activeAccordion === 0 && (
                  <div style={{ padding: '0 1rem 1rem 1rem', fontSize: '0.8rem', lineHeight: '1.6', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <li>Toàn bộ mã nguồn, thiết kế, database do CTV viết ra thuộc quyền <strong>sở hữu trí tuệ độc quyền và vĩnh viễn</strong> của CollabTask và đối tác dự án.</li>
                      <li>Nghiêm cấm hành vi sao chép, trích xuất, bán lại hoặc chuyển giao mã nguồn cho bất kỳ bên thứ ba nào.</li>
                      <li>CTV tự chịu trách nhiệm pháp lý nếu nộp code vi phạm bản quyền sáng chế hoặc giấy phép bản quyền của bên thứ ba.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion Item 2 */}
              <div 
                style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  background: activeAccordion === 1 ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                  borderLeft: activeAccordion === 1 ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setActiveAccordion(activeAccordion === 1 ? null : 1)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Lock size={16} style={{ color: activeAccordion === 1 ? 'var(--primary)' : 'var(--text-muted)' }} />
                    <strong style={{ fontSize: '0.85rem', color: activeAccordion === 1 ? 'var(--text-title)' : 'var(--text-main)' }}>
                      Điều 2: Cam kết Bảo mật Dự án (NDA)
                    </strong>
                  </div>
                  {activeAccordion === 1 ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
                
                {activeAccordion === 1 && (
                  <div style={{ padding: '0 1rem 1rem 1rem', fontSize: '0.8rem', lineHeight: '1.6', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <li>Bảo mật tuyệt đối thông tin thiết kế dự án, cấu trúc API, cơ sở dữ liệu và thông số kết nối nghiệp vụ hệ thống.</li>
                      <li>Nghiêm cấm tuyệt đối việc đẩy API Keys, passwords, secrets, private certificates lên GitHub công khai.</li>
                      <li>Vi phạm NDA bảo mật sẽ bị <strong>khóa tài khoản lập tức, tịch thu số dư ví khả dụng</strong> và chịu trách nhiệm đền bù thiệt hại.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion Item 3 */}
              <div 
                style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  background: activeAccordion === 2 ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                  borderLeft: activeAccordion === 2 ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setActiveAccordion(activeAccordion === 2 ? null : 2)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <XCircle size={16} style={{ color: activeAccordion === 2 ? 'var(--primary)' : 'var(--text-muted)' }} />
                    <strong style={{ fontSize: '0.85rem', color: activeAccordion === 2 ? 'var(--text-title)' : 'var(--text-main)' }}>
                      Điều 3: Quy định chống Gian lận & Đạo văn
                    </strong>
                  </div>
                  {activeAccordion === 2 ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
                
                {activeAccordion === 2 && (
                  <div style={{ padding: '0 1rem 1rem 1rem', fontSize: '0.8rem', lineHeight: '1.6', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <li>Cấm tuyệt đối hành vi sao chép code của CTV khác hoặc lạm dụng AI tự động tạo mã nguồn rác mà bản thân CTV không hiểu rõ logic.</li>
                      <li>Hệ thống chạy đối soát quét trùng lặp tự động với tất cả các PR nộp lên.</li>
                      <li>Gian lận, tạo nhiều tài khoản ảo trục lợi sẽ bị <strong>xóa tài khoản vĩnh viễn, tịch thu tiền ví và đưa vào danh sách đen</strong>.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion Item 4 */}
              <div 
                style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  background: activeAccordion === 3 ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                  borderLeft: activeAccordion === 3 ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setActiveAccordion(activeAccordion === 3 ? null : 3)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Hourglass size={16} style={{ color: activeAccordion === 3 ? 'var(--primary)' : 'var(--text-muted)' }} />
                    <strong style={{ fontSize: '0.85rem', color: activeAccordion === 3 ? 'var(--text-title)' : 'var(--text-main)' }}>
                      Điều 4: Cam kết Chất lượng & Trễ hạn (SLA)
                    </strong>
                  </div>
                  {activeAccordion === 3 ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
                
                {activeAccordion === 3 && (
                  <div style={{ padding: '0 1rem 1rem 1rem', fontSize: '0.8rem', lineHeight: '1.6', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <li>CTV tự chịu trách nhiệm sửa đổi miễn phí các lỗi phát sinh (bugfix) từ logic code của mình trong vòng 24 giờ kể từ khi được báo cáo.</li>
                      <li>Nộp bài quá hạn deadline (mà không xin gia hạn trước 12h) sẽ bị <strong>khấu trừ 20% - 50% tiền thưởng</strong> hoặc hủy tư cách làm việc.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion Item 5 */}
              <div 
                style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  background: activeAccordion === 4 ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                  borderLeft: activeAccordion === 4 ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setActiveAccordion(activeAccordion === 4 ? null : 4)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Wallet size={16} style={{ color: activeAccordion === 4 ? 'var(--primary)' : 'var(--text-muted)' }} />
                    <strong style={{ fontSize: '0.85rem', color: activeAccordion === 4 ? 'var(--text-title)' : 'var(--text-main)' }}>
                      Điều 5: Cơ chế Ví tiền & Giải quyết tranh chấp
                    </strong>
                  </div>
                  {activeAccordion === 4 ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
                
                {activeAccordion === 4 && (
                  <div style={{ padding: '0 1rem 1rem 1rem', fontSize: '0.8rem', lineHeight: '1.6', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <li>Rút tiền tối thiểu từ 100.000đ, lệnh rút ngân hàng được đối soát và giải ngân trực tiếp trong vòng 24 giờ làm việc.</li>
                      <li>Trong trường hợp tranh chấp về chấm điểm KPIs kỹ thuật, CTV có quyền gửi khiếu nại trong vòng 3 ngày.</li>
                      <li>Ban quản trị sẽ đối soát kỹ thuật độc lập với 2 Senior Engineers. Phán quyết cuối cùng của hội đồng có hiệu lực thi hành ngay.</li>
                    </ul>
                  </div>
                )}
              </div>

            </div>
            
            <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center', marginTop: 'auto' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '600', display: 'block', lineHeight: '1.5' }}>
                ℹ️ Việc đăng nhập và nhận nhiệm vụ trên CollabTask đồng nghĩa với việc bạn tự nguyện cam kết tuân thủ vô điều kiện tất cả các điều khoản quy chế trên.
              </span>
            </div>
          </div>

        </div>

      </div>
    );
  };

  // Helper to get abbreviation
  const getAbbreviation = (name) => {
    if (!name) return 'CTV';
    return name.substring(0, 2).toUpperCase();
  };

  // Render Leaderboard
  const renderLeaderboard = () => {
    if (loadingLeaderboard) {
      return (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <span className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></span>
          <p style={{ marginTop: '1rem' }}>Đang tải bảng xếp hạng vinh danh...</p>
        </div>
      );
    }

    const top1 = leaderboardData[0];
    const top2 = leaderboardData[1];
    const top3 = leaderboardData[2];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Premium Header */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '2rem', 
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)', 
            border: '1px solid rgba(234, 179, 8, 0.2)', 
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 8px 32px 0 rgba(234, 179, 8, 0.05)',
          }}
        >
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem' }}>
            <span style={{ filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.8))' }}>🏆</span>
            <span style={{ background: 'linear-gradient(to right, #fbbf24, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Bảng Xếp Hạng Cộng Tác Viên
            </span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Vinh danh những chiến binh công nghệ xuất sắc nhất! Hãy cống hiến hết mình, thăng cấp Level để mở rộng giới hạn nhận việc và nhận thù lao bonus cực khủng!
          </p>
        </div>

        {/* Podium Top 3 */}
        {leaderboardData.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '2rem', margin: '2rem 0 1rem 0', flexWrap: 'wrap' }}>
            {/* Rank 2 */}
            {top2 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '130px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #9ca3af 0%, #4b5563 100%)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  border: '3px solid #d1d5db',
                  boxShadow: '0 0 15px rgba(209, 213, 219, 0.4)',
                  position: 'relative'
                }}>
                  {getAbbreviation(top2.name)}
                  <div style={{
                    position: 'absolute',
                    bottom: '-5px',
                    right: '-5px',
                    background: '#d1d5db',
                    color: '#111',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>2</div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-title)', marginTop: '0.5rem', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {top2.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cấp {getLevelInfoFrontend(top2.exp).level}</span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: '600' }}>{top2.exp.toLocaleString()} EXP</span>
                <div style={{
                  width: '100px',
                  height: '80px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px 8px 0 0',
                  marginTop: '0.75rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <strong style={{ fontSize: '1.5rem', color: '#d1d5db' }}>II</strong>
                </div>
              </div>
            )}

            {/* Rank 1 */}
            {top1 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '150px', transform: 'scale(1.1)', zIndex: 2 }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem', position: 'absolute', top: '-22px', left: '50%', transform: 'translateX(-50%)', filter: 'drop-shadow(0 0 5px rgba(245, 158, 11, 0.5))' }}>👑</span>
                  <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '1.4rem',
                    border: '3px solid #fbbf24',
                    boxShadow: '0 0 25px rgba(245, 158, 11, 0.7)',
                    position: 'relative'
                  }}>
                    {getAbbreviation(top1.name)}
                    <div style={{
                      position: 'absolute',
                      bottom: '-5px',
                      right: '-5px',
                      background: '#fbbf24',
                      color: '#111',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 'bold'
                    }}>1</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fbbf24', marginTop: '0.5rem', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {top1.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cấp {getLevelInfoFrontend(top1.exp).level}</span>
                <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '600' }}>{top1.exp.toLocaleString()} EXP</span>
                <div style={{
                  width: '120px',
                  height: '110px',
                  background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px 8px 0 0',
                  marginTop: '0.75rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: '0 8px 32px rgba(245, 158, 11, 0.15)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <strong style={{ fontSize: '2rem', color: '#fbbf24', textShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}>I</strong>
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {top3 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '130px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ca8a04 0%, #78350f 100%)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  border: '3px solid #facc15',
                  boxShadow: '0 0 15px rgba(250, 204, 21, 0.4)',
                  position: 'relative'
                }}>
                  {getAbbreviation(top3.name)}
                  <div style={{
                    position: 'absolute',
                    bottom: '-5px',
                    right: '-5px',
                    background: '#facc15',
                    color: '#111',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>3</div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-title)', marginTop: '0.5rem', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {top3.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cấp {getLevelInfoFrontend(top3.exp).level}</span>
                <span style={{ fontSize: '0.75rem', color: '#facc15', fontWeight: '600' }}>{top3.exp.toLocaleString()} EXP</span>
                <div style={{
                  width: '100px',
                  height: '60px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px 8px 0 0',
                  marginTop: '0.75rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <strong style={{ fontSize: '1.2rem', color: '#facc15' }}>III</strong>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            Chưa có dữ liệu bảng xếp hạng!
          </div>
        )}

        {/* Ranking List */}
        {leaderboardData.length > 0 && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '750', marginBottom: '1.25rem', color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} style={{ color: '#fbbf24' }} />
              Danh sách thứ hạng thực tế
            </h3>
            
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>Thứ hạng</th>
                    <th>Cộng tác viên</th>
                    <th>Cấp độ</th>
                    <th>Kinh nghiệm (EXP)</th>
                    <th>Quyền lợi Active Jobs</th>
                    <th>% Thưởng Thù Lao</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((ctv, index) => {
                    const levelInfo = getLevelInfoFrontend(ctv.exp);
                    const isMe = ctv.id === currentCtv?.id;
                    const rank = index + 1;
                    
                    return (
                      <tr 
                        key={ctv.id}
                        style={{
                          background: isMe ? 'rgba(168, 85, 247, 0.08)' : 'transparent',
                          borderLeft: isMe ? '3px solid var(--primary)' : '1px solid var(--border-color)',
                          transition: 'all 0.2s ease',
                          fontWeight: isMe ? 'bold' : 'normal'
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: rank === 1 ? '#f59e0b' : (rank === 2 ? '#9ca3af' : (rank === 3 ? '#b45309' : 'rgba(255, 255, 255, 0.05)')),
                            color: rank <= 3 ? '#111' : 'var(--text-muted)',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            boxShadow: rank <= 3 ? '0 0 10px rgba(255,255,255,0.1)' : 'none'
                          }}>
                            {rank}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isMe ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              color: '#fff',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              border: isMe ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--border-color)'
                            }}>
                              {getAbbreviation(ctv.name)}
                            </div>
                            <div>
                              <strong style={{ color: isMe ? 'var(--text-title)' : 'var(--text-main)', fontSize: '0.88rem' }}>
                                {ctv.name} {isMe && <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 'bold' }}>(Bạn)</span>}
                              </strong>
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                                {isMe ? `Số dư ví: ${(currentCtv?.balance || 0).toLocaleString()}đ` : 'Cộng tác viên hoạt động'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-primary" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', fontWeight: '700' }}>
                            Cấp {levelInfo.level}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-title)' }}>{ctv.exp.toLocaleString()}</strong> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EXP</span>
                        </td>
                        <td>
                          Nhận tối đa <strong>{levelInfo.maxJobs} việc</strong>
                        </td>
                        <td style={{ color: 'var(--success)', fontWeight: '700' }}>
                          +{levelInfo.bonusPercent}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Render sub-view dynamically based on virtual routing tab */}
      {activeTab === 'portal' && renderDashboard()}
      {activeTab === 'my-tasks' && renderTasks()}
      {activeTab === 'my-submissions' && renderSubmissions()}
      {activeTab === 'my-wallet' && renderWallet()}
      {activeTab === 'leaderboard' && renderLeaderboard()}
      {activeTab === 'guide-terms' && renderGuideTerms()}

      {/* Submit Report Modal */}
      {submittingTask && (
        <Modal
          isOpen={!!submittingTask}
          onClose={() => setSubmittingTask(null)}
          title="Nộp báo cáo hoàn thành nhiệm vụ"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setSubmittingTask(null)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleTaskSubmit}>
                Gửi báo cáo
              </button>
            </>
          }
        >
          <form onSubmit={handleTaskSubmit}>
            <div 
              style={{ 
                background: 'rgba(99, 102, 241, 0.05)', 
                border: '1px solid var(--border-color)', 
                padding: '0.85rem', 
                borderRadius: 'var(--border-radius-sm)',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                color: 'var(--text-main)'
              }}
            >
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-title)', marginBottom: '0.25rem' }}>{submittingTask.title}</h4>
              <p>Phần thưởng: <strong style={{ color: 'var(--success)' }}>{submittingTask.reward.toLocaleString()}đ</strong></p>
              <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-line', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Yêu cầu bằng chứng:</strong><br />
                {submittingTask.requirements}
              </p>
            </div>

            <div className="form-group">
              <label>Đường dẫn bằng chứng (Proof Link URL) *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="url"
                  className="form-control"
                  placeholder="Ví dụ: https://facebook.com/myusername/posts/12345"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
                <Globe 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)' 
                  }} 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Ghi chú hoặc phản hồi thêm cho Admin</label>
              <textarea
                className="form-control"
                placeholder="Nhập ghi chú (nếu có)..."
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                rows="3"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div className="form-group">
              <label>Tải ảnh chụp bằng chứng (Mock Upload)</label>
              <div 
                style={{ 
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--border-radius-sm)',
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'var(--input-bg)',
                  transition: 'all var(--transition-fast)'
                }}
                onClick={() => triggerToast('Tải ảnh thành công (Mock)!', 'success')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                  <Plus size={20} />
                  <span style={{ fontSize: '0.8rem' }}>Click để tải ảnh lên (PNG, JPG)</span>
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}
      {/* Task Details Modal */}
      {selectedTaskDetails && (() => {
        // Fallbacks if data properties are not defined
        const kpis = selectedTaskDetails.kpis || [
          'Chất lượng code đạt tiêu chuẩn Clean Code (không dư thừa, định dạng chuẩn).',
          'Vượt qua tất cả các bài kiểm tra lỗi bảo mật cơ bản.',
          'Nộp bài đúng thời hạn deadline đã cam kết.',
          'Bằng chứng nghiệm thu (PR/Link) hoạt động chính xác, cấu trúc rõ ràng.'
        ];
        const techReqs = selectedTaskDetails.technicalRequirements || [
          'Sử dụng các công nghệ tương ứng được liệt kê trong nền tảng.',
          'Đảm bảo mã nguồn hoạt động độc lập và không chứa các cấu hình cứng nhạy cảm.'
        ];
        const instructions = selectedTaskDetails.instructions || [
          'Bước 1: Fork/Clone repository mã nguồn dự án.',
          'Bước 2: Tạo branch làm việc mới từ nhánh chính.',
          'Bước 3: Phát triển tính năng hoặc sửa lỗi ở local và tự kiểm thử.',
          'Bước 4: Đẩy code và tạo Pull Request (PR) mô tả rõ những thay đổi đã thực hiện.',
          'Bước 5: Sao chép link PR nộp lên cổng thông tin CollabTask.'
        ];
        const milestones = selectedTaskDetails.milestones || [
          { title: 'Bắt đầu & Thiết kế', date: new Date(new Date(selectedTaskDetails.createdAt || Date.now()).getTime() + 2*24*60*60*1000).toISOString().split('T')[0] },
          { title: 'Nộp bản Draft PR', date: new Date(new Date(selectedTaskDetails.deadline).getTime() - 5*24*60*60*1000).toISOString().split('T')[0] },
          { title: 'Hoàn thiện & Hạn chót', date: selectedTaskDetails.deadline },
          { title: 'Nghiệm thu & Giải ngân', date: new Date(new Date(selectedTaskDetails.deadline).getTime() + 2*24*60*60*1000).toISOString().split('T')[0] }
        ];

        const mySub = mySubmissions.find(s => s.taskId === selectedTaskDetails.id);
        const hasApproved = mySub && mySub.status === 'approved';
        const hasPending = mySub && mySub.status === 'pending';
        const hasRejected = mySub && mySub.status === 'rejected';

        const isAssignedToMe = selectedTaskDetails.assignedCtvId === currentCtv.id;
        const isAssignedToOther = selectedTaskDetails.assignedCtvId !== null && selectedTaskDetails.assignedCtvId !== undefined && selectedTaskDetails.assignedCtvId !== currentCtv.id;
        const isUnassigned = selectedTaskDetails.assignedCtvId === null || selectedTaskDetails.assignedCtvId === undefined;
        const assignedCtvName = isAssignedToOther ? (collaborators.find(c => c.id === selectedTaskDetails.assignedCtvId)?.name || 'CTV khác') : '';

        return (
          <Modal
            isOpen={!!selectedTaskDetails}
            onClose={() => setSelectedTaskDetails(null)}
            title="Bảng Chi Tiết & Hướng Dẫn CTV"
            size="xxl"
            footer={
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleDownloadTaskMarkdown(selectedTaskDetails, { kpis, techReqs, instructions, mySub })}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
                    marginRight: 'auto'
                  }}
                >
                  <Download size={16} />
                  <span>Tải tài liệu MD</span>
                </button>
                <button className="btn btn-secondary" onClick={() => setSelectedTaskDetails(null)}>
                  Đóng
                </button>

                {isUnassigned && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      handleAcceptTask(selectedTaskDetails.id);
                      setSelectedTaskDetails(null);
                    }}
                    style={{ 
                      background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)', 
                      border: 'none', 
                      boxShadow: '0 4px 12px rgba(168, 85, 247, 0.2)' 
                    }}
                  >
                    Nhận nhiệm vụ
                  </button>
                )}

                {isAssignedToMe && (
                  <>
                    {!hasApproved && !hasPending && (
                      <button 
                        className="btn" 
                        style={{ 
                          background: 'rgba(239, 68, 68, 0.12)', 
                          color: '#f87171', 
                          border: '1px solid rgba(239, 68, 68, 0.25)' 
                        }}
                        onClick={() => {
                          handleCancelTask(selectedTaskDetails.id);
                          setSelectedTaskDetails(null);
                        }}
                      >
                        Hủy nhận
                      </button>
                    )}
                    {!hasApproved && !hasPending && (
                      <button 
                        className="btn btn-primary" 
                        onClick={() => {
                          const task = selectedTaskDetails;
                          setSelectedTaskDetails(null);
                          handleOpenSubmitModal(task);
                        }}
                      >
                        {hasRejected ? 'Nộp báo cáo lại' : 'Nộp báo cáo ngay'}
                      </button>
                    )}
                  </>
                )}
              </div>
            }
          >
            <div style={{ maxHeight: '76vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
              
              {/* Header with Title and Reward Badge */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start', 
                  gap: '1.5rem',
                  marginBottom: '1.5rem',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '1.25rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className="badge badge-info">{selectedTaskDetails.platform}</span>
                    <span className="badge badge-primary" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>Quy mô: Lập trình</span>
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: '850', color: 'var(--text-title)', margin: 0, lineHeight: '1.4' }}>
                    {selectedTaskDetails.title}
                  </h3>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Thù lao cố định</span>
                  <strong style={{ color: 'var(--success)', fontSize: '1.5rem', fontFamily: 'var(--font-heading)', display: 'block' }}>
                    {selectedTaskDetails.reward.toLocaleString()}đ
                  </strong>
                </div>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="one-page-layout">
                
                {/* Left Column - Core Description, Instructions & KPIs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Section 1: Job Description */}
                  <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📋 Mô tả công việc
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
                      {selectedTaskDetails.description}
                    </p>
                  </div>

                  {/* Section 2: KPIs & Acceptance Criteria */}
                  <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🎯 Chỉ số KPIs & Tiêu chí Nghiệm thu
                    </h4>
                    <div 
                      style={{ 
                        background: 'rgba(16, 185, 129, 0.03)', 
                        border: '1px solid rgba(16, 185, 129, 0.12)', 
                        padding: '0.75rem 0.85rem', 
                        borderRadius: '6px', 
                        marginBottom: '1rem',
                        fontSize: '0.78rem',
                        color: 'rgba(16, 185, 129, 0.95)',
                        lineHeight: '1.4'
                      }}
                    >
                      💡 Cộng tác viên vui lòng hoàn thiện đầy đủ các chỉ số KPIs dưới đây. Hệ thống kiểm thử tự động (CI/CD) và Admin sẽ chấm điểm dựa trên danh sách này để phê duyệt giải ngân ví.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {kpis.map((kpi, idx) => (
                        <div 
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '0.6rem 0.75rem',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px'
                          }}
                        >
                          <div 
                            style={{ 
                              color: 'var(--success)', 
                              marginTop: '0.15rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: 'rgba(16, 185, 129, 0.1)',
                              flexShrink: 0
                            }}
                          >
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9 1L3.5 6.5L1 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>{kpi}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Detailed Steps Instructions */}
                  <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🛠️ Hướng dẫn thực hiện & Git Workflow
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {instructions.map((step, idx) => (
                        <div 
                          key={idx}
                          style={{
                            display: 'flex',
                            gap: '0.75rem',
                            fontSize: '0.82rem',
                            lineHeight: '1.5',
                            color: 'var(--text-main)',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '0.65rem 0.85rem'
                          }}
                        >
                          <span style={{ color: 'var(--primary)', fontWeight: '700', fontFamily: 'var(--font-heading)' }}>
                            {(idx + 1).toString().padStart(2, '0')}.
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Right Column - Timeline, Requirements & Submissions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Section 4: Proof Submission Requirements */}
                  <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.82rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🔗 Yêu cầu nộp bằng chứng
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.5', margin: 0, fontWeight: '500' }}>
                      {selectedTaskDetails.requirements}
                    </p>
                  </div>

                  {/* Section 6: Technical Requirements */}
                  <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      💻 Yêu cầu kỹ thuật bắt buộc
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {techReqs.map((req, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>•</span>
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 7: Báo cáo & Trạng thái nộp bài của tôi */}
                  <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📊 Trạng thái báo cáo của bạn
                    </h4>
                    
                    {isAssignedToOther ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem 1rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🔒</span>
                        <span>Nhiệm vụ này đã được nhận bởi CTV: <strong>{assignedCtvName}</strong>.</span>
                      </div>
                    ) : isUnassigned ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem 1rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <span>Bạn chưa nhận nhiệm vụ này. Vui lòng nhận nhiệm vụ trước khi nộp báo cáo!</span>
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ 
                            background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)', 
                            border: 'none', 
                            boxShadow: '0 4px 12px rgba(168, 85, 247, 0.2)'
                          }}
                          onClick={() => {
                            handleAcceptTask(selectedTaskDetails.id);
                            setSelectedTaskDetails(null);
                          }}
                        >
                          Nhận nhiệm vụ ngay
                        </button>
                      </div>
                    ) : !mySub ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem 1rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <span>Bạn chưa nộp báo cáo hoàn thành nào.</span>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            const task = selectedTaskDetails;
                            setSelectedTaskDetails(null);
                            handleOpenSubmitModal(task);
                          }}
                        >
                          Nộp báo cáo ngay
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Thời gian nộp:</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {new Date(mySub.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(mySub.submittedAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Trạng thái:</span>
                          {mySub.status === 'pending' && <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Đang chờ duyệt</span>}
                          {mySub.status === 'approved' && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Đã giải ngân ví</span>}
                          {mySub.status === 'rejected' && <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Bị từ chối</span>}
                        </div>

                        <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: '0.5rem 0', wordBreak: 'break-all' }}>
                          <strong>GitHub PR Link:</strong> <br />
                          <a href={mySub.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', marginTop: '0.15rem', display: 'inline-block' }}>{mySub.proofUrl}</a>
                        </p>

                        {mySub.proofText && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: '0.5rem 0', background: 'rgba(255, 255, 255, 0.01)', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <strong>Ghi chú CTV:</strong> <br />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem', display: 'inline-block' }}>"{mySub.proofText}"</span>
                          </p>
                        )}

                        {mySub.status === 'rejected' && (
                          <div 
                            style={{ 
                              marginTop: '0.75rem', 
                              padding: '0.75rem', 
                              background: 'var(--danger-bg)', 
                              borderRadius: '6px', 
                              border: '1px solid rgba(239, 68, 68, 0.2)' 
                            }}
                          >
                            <p style={{ fontSize: '0.78rem', color: 'var(--danger)', margin: 0, lineHeight: '1.4' }}>
                              <strong>Lý do từ chối phản hồi từ Admin:</strong> <br />
                              <span style={{ fontWeight: '600', marginTop: '0.15rem', display: 'inline-block' }}>{mySub.rejectReason}</span>
                            </p>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ marginTop: '0.6rem', width: '100%', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                              onClick={() => {
                                const task = selectedTaskDetails;
                                setSelectedTaskDetails(null);
                                handleOpenSubmitModal(task);
                              }}
                            >
                              <Send size={11} />
                              <span>Nộp lại báo cáo sửa đổi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* Deadline Row */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  fontSize: '0.8rem', 
                  borderTop: '1px solid var(--border-color)', 
                  paddingTop: '1rem',
                  marginTop: '1.5rem' 
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Thời hạn chót gửi báo cáo:</span>
                <strong style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
                  {new Date(selectedTaskDetails.deadline).toLocaleDateString('vi-VN')}
                </strong>
              </div>

            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default CollaboratorPortal;
