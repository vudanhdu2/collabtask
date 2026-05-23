import React, { useState } from 'react';
import {
  Users,
  CheckSquare,
  Wallet,
  Clock,
  TrendingUp,
  UserPlus,
  ArrowUpRight
} from 'lucide-react';
import Modal from './UI/Modal';

const AdminDashboard = ({
  collaborators,
  tasks,
  submissions,
  payouts,
  setActiveTab
}) => {
  const [selectedInsight, setSelectedInsight] = useState(null);

  const formatCurrency = (value = 0) => `${Number(value || 0).toLocaleString()}đ`;
  const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa có';
  const findCtv = (id) => collaborators.find(c => c.id === id);
  const findTask = (id) => tasks.find(t => t.id === id);
  const openInsight = (type, title, payload = {}) => setSelectedInsight({ type, title, payload });
  const closeInsight = () => setSelectedInsight(null);
  const goToTab = (tab) => {
    closeInsight();
    setActiveTab(tab);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'paid':
        return <span className="badge badge-success">{status === 'active' ? 'Hoạt động' : 'Thành công'}</span>;
      case 'pending':
        return <span className="badge badge-warning">Chờ duyệt</span>;
      case 'revision_requested':
        return <span className="badge badge-warning">Cần sửa</span>;
      case 'rejected':
      case 'blocked':
        return <span className="badge badge-danger">{status === 'blocked' ? 'Tạm khóa' : 'Từ chối'}</span>;
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'paused':
        return <span className="badge badge-warning">Paused</span>;
      default:
        return <span className="badge badge-info">{status || 'N/A'}</span>;
    }
  };

  const totalCtvs = collaborators.length;
  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const revisionSubmissions = submissions.filter(s => s.status === 'revision_requested');
  const pendingSubmissionsCount = pendingSubmissions.length;
  const revisionSubmissionsCount = revisionSubmissions.length;
  const pendingCollaboratorsCount = collaborators.filter(c => c.status === 'pending').length;
  const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed');
  const overdueTasksCount = overdueTasks.length;
  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const pendingPayoutsCount = pendingPayouts.length;
  const approvedSubmissions = submissions.filter(s => s.status === 'approved');

  const totalPaid = payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingPayoutsAmount = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
  const totalTaskValue = approvedSubmissions.reduce((sum, s) => sum + s.reward, 0);

  const buildCtvSummary = (ctv) => {
    const ctvSubs = submissions.filter(s => s.ctvId === ctv.id);
    const ctvPayouts = payouts.filter(p => p.ctvId === ctv.id);
    const approved = ctvSubs.filter(s => s.status === 'approved');
    return {
      ...ctv,
      submissions: ctvSubs,
      payouts: ctvPayouts,
      completed: approved.length,
      pending: ctvSubs.filter(s => s.status === 'pending').length,
      revision: ctvSubs.filter(s => s.status === 'revision_requested').length,
      rejected: ctvSubs.filter(s => s.status === 'rejected').length,
      earnings: approved.reduce((sum, s) => sum + s.reward, 0),
      paid: ctvPayouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
      pendingPayout: ctvPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)
    };
  };

  const getRecentActivities = () => {
    const activities = [];

    submissions.forEach(sub => {
      const ctv = findCtv(sub.ctvId);
      const task = findTask(sub.taskId);
      if (ctv && task) {
        activities.push({
          type: 'submission',
          time: new Date(sub.submittedAt),
          title: 'Nộp báo cáo nhiệm vụ',
          desc: `${ctv.name} đã báo cáo: "${task.title}"`,
          status: sub.status,
          meta: formatCurrency(sub.reward),
          entityType: 'submission',
          entity: sub,
          ctv,
          task
        });
      }
    });

    payouts.forEach(p => {
      const ctv = findCtv(p.ctvId);
      if (ctv) {
        activities.push({
          type: 'payout',
          time: new Date(p.requestedAt),
          title: p.status === 'pending' ? 'Yêu cầu rút tiền mới' : 'Rút tiền thành công',
          desc: `${ctv.name} yêu cầu rút về ${p.bankName}`,
          status: p.status,
          meta: `-${formatCurrency(p.amount)}`,
          entityType: 'payout',
          entity: p,
          ctv
        });
      }
    });

    collaborators.forEach(c => {
      activities.push({
        type: 'ctv_register',
        time: new Date(c.joinedAt),
        title: 'Cộng tác viên mới',
        desc: `${c.name} (${c.phone}) vừa gia nhập hệ thống`,
        status: c.status === 'pending' ? 'pending' : 'approved',
        meta: 'CTV',
        entityType: 'collaborator',
        entity: c,
        ctv: c
      });
    });

    tasks.forEach(task => {
      if (task.acceptedAt || task.completedAt || task.lastActivityAt) {
        const ctv = findCtv(task.assignedCtvId);
        activities.push({
          type: 'task',
          time: new Date(task.completedAt || task.lastActivityAt || task.acceptedAt),
          title: task.status === 'completed' ? 'Nhiệm vụ hoàn thành' : 'Cập nhật nhiệm vụ',
          desc: `${task.title}${ctv ? ` · ${ctv.name}` : ''}`,
          status: task.status,
          meta: task.taskCode || `task-${task.id}`,
          entityType: 'task',
          entity: task,
          ctv
        });
      }
    });

    return activities.sort((a, b) => b.time - a.time).slice(0, 8);
  };

  const recentActivities = getRecentActivities();

  const chartDays = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateKey = date.toISOString().split('T')[0];
    const items = approvedSubmissions.filter(s => (s.reviewedAt || s.submittedAt || '').startsWith(dateKey));
    return {
      day: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
      label: date.toLocaleDateString('vi-VN'),
      dateKey,
      count: items.length,
      items,
      height: '8%'
    };
  });
  const maxChartCount = Math.max(...chartDays.map(d => d.count), 1);
  chartDays.forEach(d => {
    d.height = `${Math.max(8, Math.round((d.count / maxChartCount) * 90))}%`;
  });

  const topCtvs = [...collaborators]
    .map(buildCtvSummary)
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 4);

  const clickableStyle = {
    cursor: 'pointer',
    transition: 'transform 0.18s ease, border-color 0.18s ease, background 0.18s ease'
  };

  const renderMiniList = (items, emptyText, renderItem) => (
    items.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {items.map(renderItem)}
      </div>
    ) : (
      <div style={{ padding: '1rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)', color: 'var(--text-muted)', textAlign: 'center' }}>
        {emptyText}
      </div>
    )
  );

  const renderSubmissionItem = (sub) => {
    const ctv = findCtv(sub.ctvId);
    const task = findTask(sub.taskId);
    return (
      <div key={sub.id} style={{ padding: '0.8rem', background: 'var(--input-bg)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.35rem' }}>
          <strong style={{ color: 'var(--text-title)' }}>{task?.title || `Task #${sub.taskId}`}</strong>
          {getStatusBadge(sub.status)}
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{ctv?.name || 'Không rõ CTV'} · {formatCurrency(sub.reward)} · {formatDateTime(sub.submittedAt)}</p>
        {sub.proofUrl && <a href={sub.proofUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{sub.proofUrl}</a>}
      </div>
    );
  };

  const renderPayoutItem = (payout) => {
    const ctv = findCtv(payout.ctvId);
    return (
      <div key={payout.id} style={{ padding: '0.8rem', background: 'var(--input-bg)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.35rem' }}>
          <strong style={{ color: 'var(--text-title)' }}>{ctv?.name || 'Không rõ CTV'} · {formatCurrency(payout.amount)}</strong>
          {getStatusBadge(payout.status)}
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{payout.bankName} · {payout.accountNumber} · {payout.accountHolder}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Yêu cầu: {formatDateTime(payout.requestedAt)} {payout.transactionId ? `· Mã GD: ${payout.transactionId}` : ''}</p>
      </div>
    );
  };

  const renderTaskItem = (task) => {
    const ctv = findCtv(task.assignedCtvId);
    return (
      <div key={task.id} style={{ padding: '0.8rem', background: 'var(--input-bg)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.35rem' }}>
          <strong style={{ color: 'var(--text-title)' }}>{task.title}</strong>
          {getStatusBadge(task.status)}
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{task.taskCode || `task-${task.id}`} · {formatCurrency(task.reward)} · {ctv?.name || 'Chưa có CTV nhận'}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deadline: {task.deadline || 'Chưa đặt'} · Nộp: {task.submissionCount || submissions.filter(s => s.taskId === task.id).length}</p>
      </div>
    );
  };

  const renderCollaboratorItem = (ctv) => {
    const summary = buildCtvSummary(ctv);
    return (
      <div key={ctv.id} style={{ padding: '0.8rem', background: 'var(--input-bg)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.35rem' }}>
          <strong style={{ color: 'var(--text-title)' }}>{ctv.name}</strong>
          {getStatusBadge(ctv.status)}
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{ctv.phone} · {ctv.email || 'Chưa có email'}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ví: {formatCurrency(ctv.balance)} · Duyệt: {summary.completed} · Earning: {formatCurrency(summary.earnings)}</p>
      </div>
    );
  };

  const renderInsightBody = () => {
    if (!selectedInsight) return null;
    const { type, payload } = selectedInsight;

    if (type === 'kpi-collaborators') {
      return (
        <>
          <div className="responsive-grid" style={{ marginBottom: '1rem' }}>
            <div className="glass-card" style={{ padding: '1rem' }}><strong>{totalCtvs}</strong><p style={{ color: 'var(--text-muted)' }}>Tổng CTV</p></div>
            <div className="glass-card" style={{ padding: '1rem' }}><strong>{pendingCollaboratorsCount}</strong><p style={{ color: 'var(--text-muted)' }}>Chờ duyệt</p></div>
          </div>
          {renderMiniList(collaborators, 'Chưa có cộng tác viên.', renderCollaboratorItem)}
        </>
      );
    }

    if (type === 'kpi-submissions') {
      const items = [...pendingSubmissions, ...revisionSubmissions].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      return renderMiniList(items, 'Không có báo cáo nào cần xử lý.', renderSubmissionItem);
    }

    if (type === 'kpi-earnings') {
      return (
        <>
          <div className="responsive-grid" style={{ marginBottom: '1rem' }}>
            <div className="glass-card" style={{ padding: '1rem' }}><strong style={{ color: 'var(--success)' }}>{formatCurrency(totalTaskValue)}</strong><p style={{ color: 'var(--text-muted)' }}>Earning đã duyệt</p></div>
            <div className="glass-card" style={{ padding: '1rem' }}><strong style={{ color: 'var(--primary)' }}>{formatCurrency(totalPaid)}</strong><p style={{ color: 'var(--text-muted)' }}>Đã thanh toán</p></div>
          </div>
          {renderMiniList(approvedSubmissions.slice().sort((a, b) => new Date(b.reviewedAt || b.submittedAt) - new Date(a.reviewedAt || a.submittedAt)).slice(0, 12), 'Chưa có earning đã duyệt.', renderSubmissionItem)}
        </>
      );
    }

    if (type === 'kpi-payouts') {
      return (
        <>
          <h4 style={{ color: 'var(--text-title)', marginBottom: '0.75rem' }}>Yêu cầu rút tiền chờ duyệt</h4>
          {renderMiniList(pendingPayouts, 'Không có payout chờ duyệt.', renderPayoutItem)}
          <h4 style={{ color: 'var(--text-title)', margin: '1.25rem 0 0.75rem' }}>Task quá hạn</h4>
          {renderMiniList(overdueTasks, 'Không có task quá hạn.', renderTaskItem)}
        </>
      );
    }

    if (type === 'chart-day') {
      return renderMiniList(payload.items || [], `Không có nhiệm vụ hoàn thành trong ngày ${payload.label}.`, renderSubmissionItem);
    }

    if (type === 'ctv') {
      const ctv = payload.ctv;
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            <div className="user-avatar" style={{ width: '56px', height: '56px', fontSize: '1.2rem' }}>{ctv.name.substring(0, 2).toUpperCase()}</div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-title)' }}>{ctv.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{ctv.phone} · {ctv.email || 'Chưa có email'}</p>
              {getStatusBadge(ctv.status)}
            </div>
          </div>
          <div className="responsive-grid" style={{ marginBottom: '1rem' }}>
            <div className="glass-card" style={{ padding: '1rem' }}><strong>{formatCurrency(ctv.balance)}</strong><p style={{ color: 'var(--text-muted)' }}>Số dư ví</p></div>
            <div className="glass-card" style={{ padding: '1rem' }}><strong>{formatCurrency(ctv.earnings)}</strong><p style={{ color: 'var(--text-muted)' }}>Earning đã duyệt</p></div>
            <div className="glass-card" style={{ padding: '1rem' }}><strong>{ctv.completed}/{ctv.submissions.length}</strong><p style={{ color: 'var(--text-muted)' }}>Việc duyệt / tổng nộp</p></div>
            <div className="glass-card" style={{ padding: '1rem' }}><strong>{formatCurrency(ctv.pendingPayout)}</strong><p style={{ color: 'var(--text-muted)' }}>Rút tiền chờ duyệt</p></div>
          </div>
          <h4 style={{ color: 'var(--text-title)', marginBottom: '0.75rem' }}>Báo cáo gần nhất</h4>
          {renderMiniList(ctv.submissions.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 6), 'CTV này chưa nộp báo cáo.', renderSubmissionItem)}
        </>
      );
    }

    if (type === 'activity') {
      const act = payload.activity;
      if (act.entityType === 'submission') {
        return (
          <>
            {renderSubmissionItem(act.entity)}
            {act.entity.proofText && <div style={{ marginTop: '1rem' }}><strong>Ghi chú CTV</strong><p style={{ whiteSpace: 'pre-line', color: 'var(--text-main)' }}>{act.entity.proofText}</p></div>}
            {act.entity.reviewHistory?.length > 0 && <div style={{ marginTop: '1rem' }}><strong>Lịch sử xử lý</strong>{act.entity.reviewHistory.map((h, i) => <p key={i} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{h.action}: {h.note} · {formatDateTime(h.createdAt)}</p>)}</div>}
          </>
        );
      }
      if (act.entityType === 'payout') return renderPayoutItem(act.entity);
      if (act.entityType === 'collaborator') return renderCollaboratorItem(act.entity);
      if (act.entityType === 'task') return renderTaskItem(act.entity);
    }

    return null;
  };

  const insightFooter = selectedInsight && (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', width: '100%', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['kpi-collaborators', 'ctv'].includes(selectedInsight.type) && <button className="btn btn-primary" onClick={() => goToTab('collaborators')}>Mở quản lý CTV</button>}
        {['kpi-submissions', 'kpi-earnings'].includes(selectedInsight.type) && <button className="btn btn-primary" onClick={() => goToTab('submissions')}>Mở duyệt báo cáo</button>}
        {selectedInsight.type === 'kpi-payouts' && <button className="btn btn-primary" onClick={() => goToTab('payouts')}>Mở rút tiền</button>}
        {selectedInsight.type === 'activity' && selectedInsight.payload.activity?.entityType === 'task' && <button className="btn btn-primary" onClick={() => goToTab('tasks')}>Mở nhiệm vụ</button>}
        {selectedInsight.type === 'activity' && selectedInsight.payload.activity?.entityType === 'submission' && <button className="btn btn-primary" onClick={() => goToTab('submissions')}>Mở báo cáo</button>}
        {selectedInsight.type === 'activity' && selectedInsight.payload.activity?.entityType === 'payout' && <button className="btn btn-primary" onClick={() => goToTab('payouts')}>Mở payout</button>}
      </div>
      <button className="btn btn-secondary" onClick={closeInsight}>Đóng</button>
    </div>
  );

  return (
    <div>
      <div className="kpi-grid">
        <div className="glass-card kpi-card" style={clickableStyle} title="Bấm để xem danh sách CTV" onClick={() => openInsight('kpi-collaborators', 'Chi tiết cộng tác viên')}>
          <div className="kpi-icon-wrapper" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}><Users size={24} /></div>
          <div className="kpi-content">
            <p className="kpi-label">Tổng Cộng Tác Viên</p>
            <h3 className="kpi-value">{totalCtvs}</h3>
            <span className="kpi-trend" style={{ color: pendingCollaboratorsCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}><UserPlus size={12} /><span>{pendingCollaboratorsCount} hồ sơ chờ duyệt</span></span>
          </div>
        </div>

        <div className="glass-card kpi-card" style={clickableStyle} title="Bấm để xem báo cáo cần xử lý" onClick={() => openInsight('kpi-submissions', 'Báo cáo cần xử lý')}>
          <div className="kpi-icon-wrapper" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}><Clock size={24} /></div>
          <div className="kpi-content">
            <p className="kpi-label">Báo Cáo Chờ Duyệt</p>
            <h3 className="kpi-value">{pendingSubmissionsCount}</h3>
            <span className="kpi-trend" style={{ color: pendingSubmissionsCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{pendingSubmissionsCount > 0 ? `Cần xử lý ngay · ${revisionSubmissionsCount} cần sửa` : `${revisionSubmissionsCount} báo cáo cần sửa`}</span>
          </div>
        </div>

        <div className="glass-card kpi-card" style={clickableStyle} title="Bấm để xem earning đã duyệt" onClick={() => openInsight('kpi-earnings', 'Chi tiết earning đã duyệt')}>
          <div className="kpi-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}><Wallet size={24} /></div>
          <div className="kpi-content">
            <p className="kpi-label">Earning Đã Duyệt</p>
            <h3 className="kpi-value">{formatCurrency(totalTaskValue)}</h3>
            <span className="kpi-trend up"><TrendingUp size={12} /><span>Đã thanh toán: {formatCurrency(totalPaid)}</span></span>
          </div>
        </div>

        <div className="glass-card kpi-card" style={clickableStyle} title="Bấm để xem payout và task quá hạn" onClick={() => openInsight('kpi-payouts', 'Rút tiền chờ duyệt & task quá hạn')}>
          <div className="kpi-icon-wrapper" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><ArrowUpRight size={24} /></div>
          <div className="kpi-content">
            <p className="kpi-label">Yêu Cầu Rút Chờ Duyệt</p>
            <h3 className="kpi-value">{formatCurrency(pendingPayoutsAmount)}</h3>
            <span className="kpi-trend" style={{ color: pendingPayoutsAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{pendingPayoutsAmount > 0 ? `${pendingPayoutsCount} yêu cầu · ${overdueTasksCount} task quá hạn` : `${overdueTasksCount} task quá hạn`}</span>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Hiệu Suất Làm Việc (7 ngày qua)</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bấm từng cột để xem chi tiết</span>
          </div>
          <div className="chart-container">
            <div className="bar-chart">
              {chartDays.map((d, index) => (
                <div key={index} className="bar-col" style={{ cursor: 'pointer' }} title={`Xem ${d.count} việc ngày ${d.label}`} onClick={() => openInsight('chart-day', `Hoàn thành ngày ${d.label}`, d)}>
                  <span className="bar-value">{d.count} việc</span>
                  <div className="bar-fill" style={{ height: d.height }}></div>
                  <span className="bar-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Cộng Tác Viên Xuất Sắc</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {topCtvs.map((ctv, index) => (
              <div key={ctv.id} onClick={() => openInsight('ctv', `Hồ sơ nhanh: ${ctv.name}`, { ctv })} title="Bấm để xem hồ sơ nhanh" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: index < topCtvs.length - 1 ? '1px solid var(--border-color)' : 'none', cursor: 'pointer' }}>
                <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '0.8rem' }}>{ctv.name.substring(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-title)' }} className="sidebar-profile-name">{ctv.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã duyệt: {ctv.completed} việc</p>
                </div>
                <div style={{ textAlign: 'right' }}><p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--success)' }}>{formatCurrency(ctv.earnings)}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Hoạt Động Gần Đây</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bấm vào từng dòng để xem sâu hơn</span>
        </div>
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
              {recentActivities.map((act, index) => (
                <tr key={index} onClick={() => openInsight('activity', act.title, { activity: act })} style={{ cursor: 'pointer' }} title="Bấm để xem chi tiết hoạt động">
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
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{act.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {act.time.toLocaleDateString('vi-VN')}</td>
                  <td>{getStatusBadge(act.status)}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700', color: act.type === 'payout' ? 'var(--danger)' : act.type === 'submission' ? 'var(--success)' : 'var(--text-title)' }}>{act.meta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!selectedInsight} onClose={closeInsight} title={selectedInsight?.title || 'Chi tiết'} size="xxl" footer={insightFooter}>
        <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '0.35rem' }}>
          {renderInsightBody()}
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
