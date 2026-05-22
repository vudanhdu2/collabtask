import React, { useState } from 'react';
import { Plus, Search, Eye, Power, Trash2, Edit, Download } from 'lucide-react';
import Modal from './UI/Modal';
import { api } from '../services/api';

const AdminTasks = ({ tasks, setTasks, submissions = [], collaborators = [], triggerToast, onDataChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTaskDetails, setViewingTaskDetails] = useState(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState('overview');
  
  // Form State
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState(30000);
  const [platform, setPlatform] = useState('Facebook');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [deadline, setDeadline] = useState('');
  const [kpisText, setKpisText] = useState('');
  const [techRequirementsText, setTechRequirementsText] = useState('');
  const [instructionsText, setInstructionsText] = useState('');
  const [milestonesText, setMilestonesText] = useState('');
  const [taskCode, setTaskCode] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('');

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');

  const getTaskLifecycle = (task) => {
    const taskSubmissions = submissions.filter(s => s.taskId === task.id);
    const latestSubmission = [...taskSubmissions].sort((a, b) => new Date(b.revisionSubmittedAt || b.submittedAt) - new Date(a.revisionSubmittedAt || a.submittedAt))[0];
    const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';

    if (task.status === 'completed' || taskSubmissions.some(s => s.status === 'approved')) {
      return { label: 'Hoàn thành', badge: 'badge-success', overdue: false };
    }
    if (latestSubmission?.status === 'revision_requested') {
      return { label: 'Cần sửa', badge: 'badge-warning', overdue };
    }
    if (latestSubmission?.status === 'pending') {
      return { label: 'Chờ duyệt', badge: 'badge-warning', overdue };
    }
    if (task.status === 'paused') {
      return { label: 'Tạm dừng', badge: 'badge-danger', overdue };
    }
    if (overdue) {
      return { label: 'Quá hạn', badge: 'badge-danger', overdue: true };
    }
    if (task.assignedCtvId !== null && task.assignedCtvId !== undefined) {
      return { label: 'Đang làm', badge: 'badge-info', overdue };
    }
    return { label: 'Chưa nhận', badge: 'badge-secondary', overdue };
  };

  const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';

  const handleDownloadTaskMarkdown = (task, computed) => {
    if (!task) return;
    const { kpis, techReqs, instructions, taskSubmissions, totalSub, successRate, totalPaid } = computed;

    const submissionLines = taskSubmissions.length === 0 
      ? '* Chưa có CTV nào nộp bài.' 
      : taskSubmissions.map(sub => {
          const ctv = collaborators.find(c => c.id === sub.ctvId);
          const statusStr = sub.status === 'approved' ? 'Đã duyệt' : sub.status === 'pending' ? 'Chờ duyệt' : 'Từ chối';
          return `- **${ctv ? ctv.name : 'Không rõ CTV'}**: [Link GitHub PR](${sub.proofUrl}) - Trạng thái: *${statusStr}*`;
        }).join('\n');

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

## 7. Báo cáo & Thống kê (Lịch sử nộp bài)
- **Tổng lượt nộp:** ${totalSub}
- **Tỷ lệ thành công:** ${successRate}%
- **Tổng ngân sách đã chi:** ${totalPaid.toLocaleString()}đ

### Danh sách nộp bài chi tiết:
${submissionLines}

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
    
    triggerToast('Tải file Markdown thành công!', 'success');
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setReward(30000);
    setPlatform('GitHub / NodeJS');
    setDescription('');
    setRequirements('');
    setKpisText('');
    setTechRequirementsText('');
    setInstructionsText('');
    setMilestonesText('');
    setTaskCode('');
    setGithubRepo('');
    setGithubBranch('');

    // Set default deadline 3 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    setDeadline(defaultDate.toISOString().split('T')[0]);
    
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setTitle(task.title);
    setReward(task.reward);
    setPlatform(task.platform);
    setDescription(task.description);
    setRequirements(task.requirements);
    setDeadline(task.deadline);
    
    setKpisText(task.kpis ? task.kpis.join('\n') : '');
    setTechRequirementsText(task.technicalRequirements ? task.technicalRequirements.join('\n') : '');
    setInstructionsText(task.instructions ? task.instructions.join('\n') : '');
    setMilestonesText(task.milestones ? task.milestones.map(m => `${m.title} | ${m.date}`).join('\n') : '');
    setTaskCode(task.taskCode || `task-${task.id}`);
    setGithubRepo(task.githubRepo || '');
    setGithubBranch(task.githubBranch || '');

    setIsModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!title.trim() || reward <= 0) {
      triggerToast('Vui lòng điền tiêu đề và tiền thưởng hợp lệ!', 'danger');
      return;
    }

    const kpis = kpisText.split('\n').map(item => item.trim()).filter(Boolean);
    const technicalRequirements = techRequirementsText.split('\n').map(item => item.trim()).filter(Boolean);
    const instructions = instructionsText.split('\n').map(item => item.trim()).filter(Boolean);
    const milestones = milestonesText.split('\n').map(item => {
      const parts = item.split('|');
      if (parts.length >= 2) {
        return { title: parts[0].trim(), date: parts[1].trim() };
      }
      return item.trim() ? { title: item.trim(), date: deadline } : null;
    }).filter(Boolean);

    const taskPayload = {
      title,
      reward: parseInt(reward),
      platform,
      description,
      requirements,
      deadline,
      kpis,
      technicalRequirements,
      instructions,
      milestones,
      taskCode: taskCode.trim() || (editingTask ? `task-${editingTask.id}` : ''),
      githubRepo: githubRepo.trim(),
      githubBranch: githubBranch.trim()
    };

    if (editingTask) {
      // Edit
      try {
        await api.tasks.update(editingTask.id, taskPayload);
        triggerToast('Cập nhật nhiệm vụ thành công!', 'success');
        if (onDataChange) {
          await onDataChange();
        }
      } catch (err) {
        triggerToast('Không thể cập nhật nhiệm vụ: ' + err.message, 'danger');
      }
    } else {
      // Create new
      const newTask = {
        id: Date.now(),
        ...taskPayload,
        status: 'active',
        submissionsCount: 0,
        createdAt: new Date().toISOString()
      };
      
      try {
        await api.tasks.create(newTask);
        triggerToast('Tạo nhiệm vụ mới thành công!', 'success');
        if (onDataChange) {
          await onDataChange();
        }
      } catch (err) {
        triggerToast('Không thể tạo nhiệm vụ: ' + err.message, 'danger');
      }
    }

    setIsModalOpen(false);
  };

  const handleToggleStatus = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nextStatus = task.status === 'active' ? 'paused' : 'active';
    
    try {
      await api.tasks.toggleStatus(id, nextStatus);
      triggerToast(`Nhiệm vụ đã ${nextStatus === 'active' ? 'kích hoạt' : 'tạm dừng'}!`, 'warning');
      if (onDataChange) onDataChange();
    } catch (err) {
      triggerToast('Lỗi cập nhật trạng thái: ' + err.message, 'danger');
    }
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này không?')) {
      try {
        await api.tasks.delete(id);
        triggerToast('Đã xóa nhiệm vụ!', 'danger');
        if (onDataChange) onDataChange();
      } catch (err) {
        triggerToast('Lỗi xóa nhiệm vụ: ' + err.message, 'danger');
      }
    }
  };

  // Filter logic
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'All' || t.platform === platformFilter;
    return matchesSearch && matchesPlatform;
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
              placeholder="Tìm kiếm nhiệm vụ..."
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
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="All">Tất cả kênh</option>
            <option value="Facebook">Facebook</option>
            <option value="TikTok">TikTok</option>
            <option value="YouTube">YouTube</option>
            <option value="Forum">Diễn đàn</option>
            <option value="Other">Khác</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} />
          <span>Tạo nhiệm vụ mới</span>
        </button>
      </div>

      {/* Tasks Table */}
      <div className="glass-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nhiệm vụ</th>
                <th>Kênh</th>
                <th>Phần thưởng</th>
                <th>Hạn chót</th>
                <th>Trạng thái</th>
                <th>Lifecycle</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    Không tìm thấy nhiệm vụ nào phù hợp!
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const lifecycle = getTaskLifecycle(task);
                  return (
                  <tr key={task.id}>
                    <td>
                      <div onClick={() => { setViewingTaskDetails(task); setActiveDetailsTab('overview'); }} style={{ cursor: 'pointer' }}>
                        <p style={{ fontWeight: '600', color: 'var(--text-title)' }} className="hover-underline">{task.title}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {task.description.substring(0, 70)}...
                        </p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '0.2rem', fontWeight: '700' }}>
                          {task.taskCode || `task-${task.id}`}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{task.platform}</span>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--success)' }}>
                      {task.reward.toLocaleString()}đ
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {new Date(task.deadline).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      {task.status === 'active' ? (
                        <span className="badge badge-success">Đang chạy</span>
                      ) : task.status === 'completed' ? (
                        <span className="badge badge-success">Hoàn thành</span>
                      ) : (
                        <span className="badge badge-danger">Tạm dừng</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${lifecycle.badge}`}>{lifecycle.label}</span>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Nộp: {task.submissionCount || submissions.filter(s => s.taskId === task.id).length} · Hoạt động: {formatDateTime(task.lastActivityAt)}
                      </p>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setViewingTaskDetails(task); setActiveDetailsTab('overview'); }}
                          title="Xem chi tiết nhiệm vụ"
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          <Eye size={14} style={{ color: 'var(--primary)' }} />
                        </button>

                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleStatus(task.id)}
                          title={task.status === 'active' ? 'Tạm dừng nhiệm vụ' : 'Kích hoạt nhiệm vụ'}
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          <Power size={14} style={{ color: task.status === 'active' ? 'var(--warning)' : 'var(--success)' }} />
                        </button>
                        
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditModal(task)}
                          title="Sửa nhiệm vụ"
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          <Edit size={14} style={{ color: 'var(--info)' }} />
                        </button>

                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDeleteTask(task.id)}
                          title="Xóa nhiệm vụ"
                          style={{ padding: '0.35rem 0.6rem' }}
                        >
                          <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Chỉnh sửa nhiệm vụ' : 'Tạo nhiệm vụ mới'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </button>
            <button className="btn btn-primary" onClick={handleSaveTask}>
              Lưu nhiệm vụ
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveTask}>
          <div className="form-group">
            <label>Tiêu đề nhiệm vụ *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ví dụ: Viết bài chia sẻ trải nghiệm sản phẩm A lên Facebook"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phần thưởng cố định (VNĐ) *</label>
              <input
                type="number"
                className="form-control"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                min="1000"
                step="5000"
                required
              />
            </div>

            <div className="form-group">
              <label>Nền tảng / Công nghệ *</label>
              <select
                className="form-control"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="GitHub / NodeJS">GitHub / NodeJS</option>
                <option value="GitHub / React">GitHub / React</option>
                <option value="GitHub / Markdown">GitHub / Markdown</option>
                <option value="GitHub / CSS">GitHub / CSS</option>
                <option value="GitHub / Testing">GitHub / Testing</option>
                <option value="Other">Khác</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Mô tả tổng quan công việc</label>
            <textarea
              className="form-control"
              placeholder="Mô tả tóm tắt nội dung công việc và mục tiêu..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="2"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div className="form-group">
            <label>Yêu cầu bằng chứng kiểm tra *</label>
            <textarea
              className="form-control"
              placeholder="Ví dụ: Pull Request gửi mã nguồn NodeJS kèm file Router và Controller."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows="2"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              required
            />
          </div>

          <div className="form-group">
            <label>Chỉ số KPIs & Tiêu chí nghiệm thu (Mỗi dòng một tiêu chí)</label>
            <textarea
              className="form-control"
              placeholder="Ví dụ:&#10;Tỷ lệ bao phủ kiểm thử (Test coverage) đạt tối thiểu 80%.&#10;Thời gian phản hồi API trung bình dưới 150ms."
              value={kpisText}
              onChange={(e) => setKpisText(e.target.value)}
              rows="3"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div className="form-group">
            <label>Yêu cầu kỹ thuật chi tiết (Mỗi dòng một yêu cầu)</label>
            <textarea
              className="form-control"
              placeholder="Ví dụ:&#10;Sử dụng Express.js v5 và thư viện bcryptjs để mã hóa.&#10;Cấu hình JWT Token có thời gian hết hạn (ExpiresIn: 24h)."
              value={techRequirementsText}
              onChange={(e) => setTechRequirementsText(e.target.value)}
              rows="3"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div className="form-group">
            <label>Hướng dẫn thực hiện cho CTV (Mỗi dòng một bước)</label>
            <textarea
              className="form-control"
              placeholder="Ví dụ:&#10;Bước 1: Clone repo chính về local.&#10;Bước 2: Tạo branch feature/task-101-auth.&#10;Bước 3: Lập trình các routes đăng nhập."
              value={instructionsText}
              onChange={(e) => setInstructionsText(e.target.value)}
              rows="4"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div className="form-group">
            <label>Mốc thời gian Milestones (Định dạng: Tên mốc | YYYY-MM-DD, mỗi dòng một mốc)</label>
            <textarea
              className="form-control"
              placeholder="Ví dụ:&#10;Thiết kế DB & Router | 2026-06-01&#10;Hoàn thiện & Tạo Pull Request | 2026-06-15"
              value={milestonesText}
              onChange={(e) => setMilestonesText(e.target.value)}
              rows="3"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div className="form-group">
            <label>Hạn chót hoàn thành *</label>
            <input
              type="date"
              className="form-control"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Mã task GitHub</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: task-103"
                value={taskCode}
                onChange={(e) => setTaskCode(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Repository GitHub</label>
              <input
                type="text"
                className="form-control"
                placeholder="owner/repo"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Branch gợi ý</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ví dụ: feature/task-103-api-spec"
              value={githubBranch}
              onChange={(e) => setGithubBranch(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* Task Details Modal */}
      {viewingTaskDetails && (() => {
        const taskSubmissions = submissions.filter(s => s.taskId === viewingTaskDetails.id);
        const totalSub = taskSubmissions.length;
        const approvedSub = taskSubmissions.filter(s => s.status === 'approved').length;
        const pendingSub = taskSubmissions.filter(s => s.status === 'pending').length;
        const rejectedSub = taskSubmissions.filter(s => s.status === 'rejected').length;
        const successRate = totalSub > 0 ? Math.round((approvedSub / totalSub) * 100) : 0;
        const totalPaid = approvedSub * viewingTaskDetails.reward;
        const assignedCtv = collaborators.find(c => c.id === viewingTaskDetails.assignedCtvId);
        const lifecycle = getTaskLifecycle(viewingTaskDetails);

        // Fallbacks if data properties are not defined
        const kpis = viewingTaskDetails.kpis || [
          'Chất lượng code đạt tiêu chuẩn Clean Code (không dư thừa, định dạng chuẩn).',
          'Vượt qua tất cả các bài kiểm tra lỗi bảo mật cơ bản.',
          'Nộp bài đúng thời hạn deadline đã cam kết.',
          'Bằng chứng nghiệm thu (PR/Link) hoạt động chính xác, cấu trúc rõ ràng.'
        ];
        const techReqs = viewingTaskDetails.technicalRequirements || [
          'Sử dụng các công nghệ tương ứng được liệt kê trong nền tảng.',
          'Đảm bảo mã nguồn hoạt động độc lập và không chứa các cấu hình cứng nhạy cảm.'
        ];
        const instructions = viewingTaskDetails.instructions || [
          'Bước 1: Fork/Clone repository mã nguồn dự án.',
          'Bước 2: Tạo branch làm việc mới từ nhánh chính.',
          'Bước 3: Phát triển tính năng hoặc sửa lỗi ở local và tự kiểm thử.',
          'Bước 4: Đẩy code và tạo Pull Request (PR) mô tả rõ những thay đổi đã thực hiện.',
          'Bước 5: Sao chép link PR nộp lên cổng thông tin CollabTask.'
        ];

        const milestones = viewingTaskDetails.milestones || [
          { title: 'Bắt đầu & Thiết kế ban đầu', date: viewingTaskDetails.createdAt || new Date().toISOString() },
          { title: 'Hoàn thiện 50% khối lượng code', date: new Date(new Date(viewingTaskDetails.deadline).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          { title: 'Unit test & Nộp bài chính thức', date: viewingTaskDetails.deadline },
          { title: 'Admin Review & Giải ngân Payout', date: new Date(new Date(viewingTaskDetails.deadline).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
        ];

        return (
          <Modal
            isOpen={!!viewingTaskDetails}
            onClose={() => setViewingTaskDetails(null)}
            title="Bảng Chi Tiết & KPIs Nhiệm Vụ"
            size="xxl"
            footer={
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleDownloadTaskMarkdown(viewingTaskDetails, { kpis, techReqs, instructions, taskSubmissions, totalSub, successRate, totalPaid })}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={16} />
                  <span>Tải tài liệu MD</span>
                </button>
                <button className="btn btn-secondary" onClick={() => setViewingTaskDetails(null)}>
                  Đóng
                </button>
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
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-info">{viewingTaskDetails.platform}</span>
                    <span className={`badge ${lifecycle.badge}`}>{lifecycle.label}</span>
                    <span className="badge badge-primary" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>{viewingTaskDetails.taskCode || `task-${viewingTaskDetails.id}`}</span>
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: '850', color: 'var(--text-title)', margin: 0, lineHeight: '1.4' }}>
                    {viewingTaskDetails.title}
                  </h3>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.15rem' }}>Thù lao cố định</span>
                  <strong style={{ color: 'var(--success)', fontSize: '1.5rem', fontFamily: 'var(--font-heading)', display: 'block' }}>
                    {viewingTaskDetails.reward.toLocaleString()}đ
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
                      {viewingTaskDetails.description}
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
                      💡 CTV bắt buộc đảm bảo hoàn thành đầy đủ danh sách kiểm tra KPIs này để được duyệt chi thưởng.
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
                  
                  <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🧭 Lifecycle & GitHub
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.65rem', fontSize: '0.8rem' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>CTV nhận:</span><br /><strong>{assignedCtv?.name || 'Chưa có'}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Số lần nộp:</span><br /><strong>{totalSub}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Nhận lúc:</span><br /><strong>{formatDateTime(viewingTaskDetails.acceptedAt)}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Hoạt động cuối:</span><br /><strong>{formatDateTime(viewingTaskDetails.lastActivityAt)}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Repo:</span><br /><strong>{viewingTaskDetails.githubRepo || '—'}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Branch:</span><br /><strong>{viewingTaskDetails.githubBranch || '—'}</strong></div>
                    </div>
                  </div>

                  {/* Section 4: Proof Submission Requirements */}
                  <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.82rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🔗 Yêu cầu nộp bằng chứng
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.5', margin: 0, fontWeight: '500' }}>
                      {viewingTaskDetails.requirements}
                    </p>
                  </div>

                  {/* Section 6: Technical Requirements */}
                  <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      💻 Yêu cầu kỹ thuật
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

                  {/* Section 7: CTV Submissions & Stats */}
                  <div className="glass-card" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-title)', marginBottom: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📊 Báo cáo & Thống kê
                    </h4>
                    
                    <div 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '0.5rem', 
                        marginBottom: '1rem',
                        background: 'rgba(99, 102, 241, 0.04)',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        textAlign: 'center'
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.15rem 0' }}>Lượt nộp</p>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-title)' }}>{totalSub}</strong>
                      </div>
                      <div style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.15rem 0' }}>Tỷ lệ</p>
                        <strong style={{ fontSize: '1rem', color: 'var(--success)' }}>{successRate}%</strong>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.15rem 0' }}>Đã chi</p>
                        <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>{totalPaid.toLocaleString()}đ</strong>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
                        Danh sách nộp bài ({totalSub}):
                      </span>
                      {taskSubmissions.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', fontSize: '0.78rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                          Chưa có CTV nào nộp bài.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                          {taskSubmissions.map(sub => {
                            const ctv = collaborators.find(c => c.id === sub.ctvId);
                            return (
                              <div 
                                key={sub.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.5rem 0.6rem',
                                  background: 'rgba(255,255,255,0.01)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px'
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <strong style={{ fontSize: '0.78rem', color: 'var(--text-title)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {ctv ? ctv.name : 'Không rõ CTV'}
                                  </strong>
                                  <a href={sub.proofUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: 'var(--primary)', textDecoration: 'underline' }}>
                                    Link GitHub PR
                                  </a>
                                </div>
                                <div style={{ flexShrink: 0, marginLeft: '0.5rem' }}>
                                  {sub.status === 'pending' && <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '0.15rem 0.35rem' }}>Chờ duyệt</span>}
                                  {sub.status === 'approved' && <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '0.15rem 0.35rem' }}>Đã duyệt</span>}
                                  {sub.status === 'rejected' && <span className="badge badge-danger" style={{ fontSize: '0.6rem', padding: '0.15rem 0.35rem' }}>Từ chối</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>

                </div>

              </div>

              {/* Deadline & Final Action Row */}
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
                <span style={{ color: 'var(--text-muted)' }}>Thời hạn chót của nhiệm vụ:</span>
                <strong style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
                  {new Date(viewingTaskDetails.deadline).toLocaleDateString('vi-VN')}
                </strong>
              </div>

            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default AdminTasks;

