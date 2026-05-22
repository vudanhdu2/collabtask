import React from 'react';
import { 
  Users, 
  CheckSquare, 
  Wallet, 
  Clock, 
  TrendingUp, 
  UserPlus, 
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';

const AdminDashboard = ({ 
  collaborators, 
  tasks, 
  submissions, 
  payouts, 
  setActiveTab 
}) => {
  // 1. Calculate statistics
  const totalCtvs = collaborators.length;
  const pendingSubmissionsCount = submissions.filter(s => s.status === 'pending').length;
  const revisionSubmissionsCount = submissions.filter(s => s.status === 'revision_requested').length;
  const pendingCollaboratorsCount = collaborators.filter(c => c.status === 'pending').length;
  const overdueTasksCount = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed').length;
  const pendingPayoutsCount = payouts.filter(p => p.status === 'pending').length;

  // Total paid out to CTVs
  const totalPaid = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  // Total pending payouts
  const pendingPayoutsAmount = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  // Total earnings generated (all approved tasks value)
  const totalTaskValue = submissions
    .filter(s => s.status === 'approved')
    .reduce((sum, s) => sum + s.reward, 0);

  // 2. Generate recent activities log
  const getRecentActivities = () => {
    const activities = [];

    // Add submissions
    submissions.forEach(sub => {
      const ctv = collaborators.find(c => c.id === sub.ctvId);
      const task = tasks.find(t => t.id === sub.taskId);
      if (ctv && task) {
        activities.push({
          type: 'submission',
          time: new Date(sub.submittedAt),
          title: `Nộp báo cáo nhiệm vụ`,
          desc: `${ctv.name} đã báo cáo: "${task.title}"`,
          status: sub.status,
          meta: `${sub.reward.toLocaleString()}đ`
        });
      }
    });

    // Add payouts
    payouts.forEach(p => {
      const ctv = collaborators.find(c => c.id === p.ctvId);
      if (ctv) {
        activities.push({
          type: 'payout',
          time: new Date(p.requestedAt),
          title: p.status === 'pending' ? 'Yêu cầu rút tiền mới' : `Rút tiền thành công`,
          desc: `${ctv.name} yêu cầu rút về ${p.bankName}`,
          status: p.status,
          meta: `-${p.amount.toLocaleString()}đ`
        });
      }
    });

    // Add new register mock if any
    collaborators.forEach(c => {
      activities.push({
        type: 'ctv_register',
        time: new Date(c.joinedAt),
        title: 'Cộng tác viên mới',
        desc: `${c.name} (${c.phone}) vừa gia nhập hệ thống`,
        status: c.status === 'pending' ? 'pending' : 'approved',
        meta: 'CTV'
      });
    });

    tasks.forEach(task => {
      if (task.acceptedAt || task.completedAt || task.lastActivityAt) {
        const ctv = collaborators.find(c => c.id === task.assignedCtvId);
        activities.push({
          type: 'task',
          time: new Date(task.completedAt || task.lastActivityAt || task.acceptedAt),
          title: task.status === 'completed' ? 'Nhiệm vụ hoàn thành' : 'Cập nhật nhiệm vụ',
          desc: `${task.title}${ctv ? ` · ${ctv.name}` : ''}`,
          status: task.status,
          meta: task.taskCode || `task-${task.id}`
        });
      }
    });

    // Sort by time descending
    return activities
      .sort((a, b) => b.time - a.time)
      .slice(0, 5); // Take top 5
  };

  const recentActivities = getRecentActivities();

  // 3. Real task completion chart (last 7 days)
  const chartDays = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateKey = date.toISOString().split('T')[0];
    const count = submissions.filter(s => (
      s.status === 'approved' &&
      (s.reviewedAt || s.submittedAt || '').startsWith(dateKey)
    )).length;
    return {
      day: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
      count,
      height: '8%'
    };
  });
  const maxChartCount = Math.max(...chartDays.map(d => d.count), 1);
  chartDays.forEach(d => {
    d.height = `${Math.max(8, Math.round((d.count / maxChartCount) * 90))}%`;
  });

  // 4. Calculate top performing CTVs
  const topCtvs = [...collaborators]
    .map(ctv => {
      const completed = submissions.filter(s => s.ctvId === ctv.id && s.status === 'approved').length;
      const earnings = submissions
        .filter(s => s.ctvId === ctv.id && s.status === 'approved')
        .reduce((sum, s) => sum + s.reward, 0);
      return { ...ctv, completed, earnings };
    })
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 4);

  return (
    <div>
      {/* 1. KPIs */}
      <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
            <Users size={24} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Tổng Cộng Tác Viên</p>
            <h3 className="kpi-value">{totalCtvs}</h3>
            <span className="kpi-trend" style={{ color: pendingCollaboratorsCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
              <UserPlus size={12} />
              <span>{pendingCollaboratorsCount} hồ sơ chờ duyệt</span>
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Báo Cáo Chờ Duyệt</p>
            <h3 className="kpi-value">{pendingSubmissionsCount}</h3>
            <span 
              className="kpi-trend" 
              style={{ color: pendingSubmissionsCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}
            >
              {pendingSubmissionsCount > 0 ? `Cần xử lý ngay · ${revisionSubmissionsCount} cần sửa` : `${revisionSubmissionsCount} báo cáo cần sửa`}
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <Wallet size={24} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Earning Đã Duyệt</p>
            <h3 className="kpi-value">{totalTaskValue.toLocaleString()}đ</h3>
            <span className="kpi-trend up">
              <TrendingUp size={12} />
              <span>Đã thanh toán: {totalPaid.toLocaleString()}đ</span>
            </span>
          </div>
        </div>

        <div className="glass-card kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <ArrowUpRight size={24} />
          </div>
          <div className="kpi-content">
            <p className="kpi-label">Yêu Cầu Rút Chờ Duyệt</p>
            <h3 className="kpi-value">{pendingPayoutsAmount.toLocaleString()}đ</h3>
            <span 
              className="kpi-trend"
              style={{ color: pendingPayoutsAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}
            >
              {pendingPayoutsAmount > 0 ? `${pendingPayoutsCount} yêu cầu · ${overdueTasksCount} task quá hạn` : `${overdueTasksCount} task quá hạn`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Charts & Analytics Grid */}
      <div className="analytics-grid">
        {/* Task Completion Bar Chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Hiệu Suất Làm Việc (7 ngày qua)</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tổng nhiệm vụ hoàn thành</span>
          </div>
          <div className="chart-container">
            <div className="bar-chart">
              {chartDays.map((d, index) => (
                <div key={index} className="bar-col">
                  <span className="bar-value">{d.count} việc</span>
                  <div className="bar-fill" style={{ height: d.height }}></div>
                  <span className="bar-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top CTV list */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Cộng Tác Viên Xuất Sắc</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topCtvs.map((ctv, index) => (
              <div 
                key={ctv.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  paddingBottom: '0.75rem',
                  borderBottom: index < topCtvs.length - 1 ? '1px solid var(--border-color)' : 'none'
                }}
              >
                <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '0.8rem' }}>
                  {ctv.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-title)' }} className="sidebar-profile-name">
                    {ctv.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Đã duyệt: {ctv.completed} việc
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--success)' }}>
                    {ctv.earnings.toLocaleString()}đ
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Recent Activities list */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Hoạt Động Gần Đây</h3>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hoạt động</th>
                <th>Chi tiết</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Số tiền / Loại</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((act, index) => {
                const getStatusBadge = (status) => {
                  switch (status) {
                    case 'approved':
                    case 'paid':
                      return <span className="badge badge-success">Thành công</span>;
                    case 'pending':
                      return <span className="badge badge-warning">Chờ duyệt</span>;
                    case 'rejected':
                      return <span className="badge badge-danger">Từ chối</span>;
                    default:
                      return <span className="badge badge-info">{status}</span>;
                  }
                };

                return (
                  <tr key={index}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                        {act.type === 'submission' && <CheckSquare size={16} style={{ color: 'var(--info)' }} />}
                        {act.type === 'payout' && <Wallet size={16} style={{ color: 'var(--success)' }} />}
                        {act.type === 'ctv_register' && <UserPlus size={16} style={{ color: 'var(--secondary)' }} />}
                        {act.type === 'task' && <Clock size={16} style={{ color: 'var(--warning)' }} />}
                        <span style={{ color: 'var(--text-title)' }}>{act.title}</span>
                      </div>
                    </td>
                    <td>{act.desc}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {act.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {act.time.toLocaleDateString('vi-VN')}
                    </td>
                    <td>{getStatusBadge(act.status)}</td>
                    <td style={{ 
                      textAlign: 'right', 
                      fontWeight: '700',
                      color: act.type === 'payout' ? 'var(--danger)' : act.type === 'submission' ? 'var(--success)' : 'var(--text-title)'
                    }}>
                      {act.meta}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
