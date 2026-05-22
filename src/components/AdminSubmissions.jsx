import React, { useState } from 'react';
import { Search, Eye, Check, X as XIcon, MessageSquare, AlertCircle } from 'lucide-react';
import Modal from './UI/Modal';
import { api } from '../services/api';

const AdminSubmissions = ({ 
  submissions, 
  setSubmissions, 
  tasks, 
  collaborators, 
  setCollaborators,
  triggerToast,
  onDataChange
}) => {
  const [filterTab, setFilterTab] = useState('pending'); // default show 'pending' first
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);
  
  // Reject reason modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingSubId, setRejectingSubId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionSubId, setRevisionSubId] = useState(null);
  const [revisionReason, setRevisionReason] = useState('');

  // 1. Process Approval
  const handleApprove = async (submissionId) => {
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return;

    try {
      await api.submissions.approve(submissionId);
      triggerToast(`Đã duyệt báo cáo! Cộng ${sub.reward.toLocaleString()}đ vào ví của CTV.`, 'success');
      if (onDataChange) onDataChange();
      if (selectedSub && selectedSub.id === submissionId) {
        setSelectedSub(null);
      }
    } catch (err) {
      triggerToast('Lỗi duyệt báo cáo: ' + err.message, 'danger');
    }
  };

  // 2. Process Rejection (Open Modal)
  const handleOpenRejectModal = (submissionId) => {
    setRejectingSubId(submissionId);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      triggerToast('Vui lòng nhập lý do từ chối!', 'warning');
      return;
    }

    try {
      await api.submissions.reject(rejectingSubId, rejectReason.trim());
      triggerToast('Đã từ chối báo cáo nhiệm vụ!', 'danger');
      if (onDataChange) onDataChange();
      setIsRejectModalOpen(false);

      if (selectedSub && selectedSub.id === rejectingSubId) {
        setSelectedSub(null);
      }
    } catch (err) {
      triggerToast('Lỗi từ chối báo cáo: ' + err.message, 'danger');
    }
  };

  const handleOpenRevisionModal = (submissionId) => {
    setRevisionSubId(submissionId);
    setRevisionReason('');
    setIsRevisionModalOpen(true);
  };

  const handleConfirmRevision = async (e) => {
    e.preventDefault();
    if (!revisionReason.trim()) {
      triggerToast('Vui lòng nhập nội dung cần CTV chỉnh sửa!', 'warning');
      return;
    }

    try {
      await api.submissions.requestRevision(revisionSubId, revisionReason.trim());
      triggerToast('Đã gửi yêu cầu sửa bài cho CTV!', 'warning');
      if (onDataChange) onDataChange();
      setIsRevisionModalOpen(false);
      if (selectedSub && selectedSub.id === revisionSubId) {
        setSelectedSub(null);
      }
    } catch (err) {
      triggerToast('Lỗi yêu cầu sửa bài: ' + err.message, 'danger');
    }
  };

  // Filter & Search Logic
  const getFilteredSubmissions = () => {
    return submissions.filter(sub => {
      const ctv = collaborators.find(c => c.id === sub.ctvId);
      const task = tasks.find(t => t.id === sub.taskId);
      
      const matchesTab = filterTab === 'all' || sub.status === filterTab;
      
      const ctvName = ctv ? ctv.name.toLowerCase() : '';
      const taskTitle = task ? task.title.toLowerCase() : '';
      const matchesSearch = ctvName.includes(searchQuery.toLowerCase()) || 
                            taskTitle.includes(searchQuery.toLowerCase());
      
      return matchesTab && matchesSearch;
    });
  };

  const displayedSubs = getFilteredSubmissions();

  return (
    <div>
      {/* Search & Filter Tabs Panel */}
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
        {/* Navigation Tabs inside Content */}
        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
          <button 
            className={`tab-btn ${filterTab === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterTab('pending')}
          >
            Chờ duyệt ({submissions.filter(s => s.status === 'pending').length})
          </button>
          <button
            className={`tab-btn ${filterTab === 'approved' ? 'active' : ''}`}
            onClick={() => setFilterTab('approved')}
          >
            Đã duyệt
          </button>
          <button
            className={`tab-btn ${filterTab === 'revision_requested' ? 'active' : ''}`}
            onClick={() => setFilterTab('revision_requested')}
          >
            Cần sửa ({submissions.filter(s => s.status === 'revision_requested').length})
          </button>
          <button 
            className={`tab-btn ${filterTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilterTab('rejected')}
          >
            Bị từ chối
          </button>
          <button 
            className={`tab-btn ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            Tất cả
          </button>
        </div>

        <div style={{ position: 'relative', width: '250px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Tìm CTV hoặc nhiệm vụ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
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
      </div>

      {/* Submissions Datagrid */}
      <div className="glass-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cộng tác viên</th>
                <th>Nhiệm vụ</th>
                <th>Tiền thưởng</th>
                <th>Thời gian nộp</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {displayedSubs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    Không có báo cáo nào ở trạng thái này!
                  </td>
                </tr>
              ) : (
                displayedSubs.map((sub) => {
                  const ctv = collaborators.find(c => c.id === sub.ctvId);
                  const task = tasks.find(t => t.id === sub.taskId);

                  return (
                    <tr key={sub.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                            {ctv ? ctv.name.substring(0, 2).toUpperCase() : 'CTV'}
                          </div>
                          <div>
                            <p style={{ fontWeight: '600', color: 'var(--text-title)' }}>{ctv ? ctv.name : 'Không rõ'}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ctv ? ctv.phone : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p style={{ fontWeight: '500', color: 'var(--text-title)' }}>{task ? task.title : 'Nhiệm vụ đã xóa'}</p>
                          <span className="badge badge-info" style={{ fontSize: '0.65rem', marginTop: '0.15rem' }}>
                            {task ? task.platform : ''}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--success)' }}>
                        {sub.reward.toLocaleString()}đ
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(sub.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        {sub.status === 'pending' && <span className="badge badge-warning">Chờ duyệt</span>}
                        {sub.status === 'approved' && <span className="badge badge-success">Đã duyệt</span>}
                        {sub.status === 'revision_requested' && (
                          <span className="badge badge-warning" title={sub.revisionReason}>
                            Cần sửa
                          </span>
                        )}
                        {sub.status === 'rejected' && (
                          <span className="badge badge-danger" title={sub.rejectReason}>
                            Bị từ chối
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedSub(sub)}
                            title="Xem chi tiết báo cáo"
                            style={{ padding: '0.35rem 0.6rem' }}
                          >
                            <Eye size={14} style={{ color: 'var(--info)' }} />
                          </button>

                          {sub.status === 'pending' && (
                            <>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleApprove(sub.id)}
                                title="Phê duyệt báo cáo"
                                style={{ padding: '0.35rem 0.6rem' }}
                              >
                               <Check size={14} style={{ color: 'var(--success)' }} />
                              </button>
                              
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenRevisionModal(sub.id)}
                                title="Yêu cầu sửa bài"
                                style={{ padding: '0.35rem 0.6rem' }}
                              >
                                <MessageSquare size={14} style={{ color: 'var(--warning)' }} />
                              </button>

                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenRejectModal(sub.id)}
                                title="Từ chối báo cáo"
                                style={{ padding: '0.35rem 0.6rem' }}
                              >
                                <XIcon size={14} style={{ color: 'var(--danger)' }} />
                              </button>
                            </>
                          )}
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

      {/* Submission Detail Modal */}
      {selectedSub && (() => {
        const ctv = collaborators.find(c => c.id === selectedSub.ctvId);
        const task = tasks.find(t => t.id === selectedSub.taskId);

        return (
          <Modal
            isOpen={!!selectedSub}
            onClose={() => setSelectedSub(null)}
            title="Chi tiết Báo cáo nhiệm vụ"
            footer={
              <>
                <button className="btn btn-secondary" onClick={() => setSelectedSub(null)}>
                  Đóng
                </button>
                {selectedSub.status === 'pending' && (
                  <>
                    <button className="btn btn-warning" onClick={() => handleOpenRevisionModal(selectedSub.id)}>
                      Yêu cầu sửa
                    </button>
                    <button className="btn btn-danger" onClick={() => handleOpenRejectModal(selectedSub.id)}>
                      Từ chối
                    </button>
                    <button className="btn btn-success" onClick={() => handleApprove(selectedSub.id)}>
                      Phê duyệt
                    </button>
                  </>
                )}
              </>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '1rem',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Cộng tác viên</label>
                  <strong style={{ color: 'var(--text-title)' }}>{ctv?.name}</strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ctv?.phone}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tiền thưởng nhiệm vụ</label>
                  <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{selectedSub.reward.toLocaleString()}đ</strong>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Nhiệm vụ thực hiện</label>
                <strong style={{ color: 'var(--text-title)' }}>{task?.title}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Hạn chót: {new Date(task?.deadline).toLocaleDateString('vi-VN')}</p>
              </div>

              <div style={{ background: 'var(--input-bg)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Link bằng chứng (Proof URL)</label>
                <a 
                  href={selectedSub.proofUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: '600' }}
                >
                  {selectedSub.proofUrl}
                </a>
              </div>

              {selectedSub.proofText && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Ghi chú/Mô tả của CTV</label>
                  <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', color: 'var(--text-main)' }}>
                    {selectedSub.proofText}
                  </p>
                </div>
              )}

              {selectedSub.revisionReason && (
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--warning-bg)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', color: 'var(--warning)' }}>
                  <MessageSquare size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.8rem', display: 'block' }}>Nội dung cần sửa:</strong>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.15rem' }}>{selectedSub.revisionReason}</p>
                  </div>
                </div>
              )}

              {selectedSub.rejectReason && (
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--danger-bg)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', color: 'var(--danger)' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.8rem', display: 'block' }}>Lý do từ chối trước đó:</strong>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.15rem' }}>{selectedSub.rejectReason}</p>
                  </div>
                </div>
              )}

              {selectedSub.reviewHistory?.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Lịch sử xử lý</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedSub.reviewHistory.map((item, index) => (
                      <div key={`${item.createdAt}-${index}`} style={{ background: 'var(--input-bg)', padding: '0.65rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-title)' }}>{item.action}</strong>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>{item.note}</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulated attached screenshot mock */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Ảnh bằng chứng đính kèm</label>
                <div 
                  style={{ 
                    height: '180px', 
                    borderRadius: 'var(--border-radius-sm)', 
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    border: '2px dashed var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    gap: '0.5rem'
                  }}
                >
                  <Eye size={24} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>[Ảnh chụp màn hình: screenshot_proof.jpg]</span>
                  <span style={{ fontSize: '0.7rem' }}>Kích thước: 420 KB | Định dạng: PNG</span>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

      <Modal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        title="Yêu cầu CTV sửa báo cáo"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsRevisionModalOpen(false)}>
              Hủy
            </button>
            <button className="btn btn-warning" onClick={handleConfirmRevision}>
              Gửi yêu cầu sửa
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmRevision}>
          <div className="form-group">
            <label>Nội dung cần chỉnh sửa *</label>
            <textarea
              className="form-control"
              placeholder="Ví dụ: PR còn thiếu test case cho luồng lỗi, vui lòng bổ sung và nộp lại link PR sau khi cập nhật."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              rows="4"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Reject Reason input Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Từ chối báo cáo công việc"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsRejectModalOpen(false)}>
              Hủy
            </button>
            <button className="btn btn-danger" onClick={handleConfirmReject}>
              Xác nhận từ chối
            </button>
          </>
        }
      >
        <form onSubmit={handleConfirmReject}>
          <div className="form-group">
            <label>Lý do từ chối bằng chứng *</label>
            <textarea
              className="form-control"
              placeholder="Nhập lý do cụ thể để CTV biết và làm lại... Ví dụ: Bài viết chưa chỉnh sửa chế độ công khai hoặc sai nội dung hashtag yêu cầu."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows="4"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminSubmissions;
