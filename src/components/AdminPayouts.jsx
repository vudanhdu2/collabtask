import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Eye, AlertTriangle, Landmark, Hash, CreditCard } from 'lucide-react';
import Modal from './UI/Modal';
import { api } from '../services/api';

const AdminPayouts = ({ 
  payouts, 
  setPayouts, 
  collaborators, 
  setCollaborators, 
  triggerToast,
  onDataChange 
}) => {
  const [filterTab, setFilterTab] = useState('pending'); // default show 'pending' first
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [approvingPayout, setApprovingPayout] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  
  const [rejectingPayout, setRejectingPayout] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // 1. Approve Payout
  const handleOpenApproveModal = (payout) => {
    setApprovingPayout(payout);
    setTransactionId('');
  };

  const handleConfirmApprove = async (e) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      triggerToast('Vui lòng nhập mã giao dịch ngân hàng!', 'warning');
      return;
    }

    try {
      await api.payouts.pay(approvingPayout.id, transactionId.trim());
      triggerToast(`Đã duyệt thanh toán ${approvingPayout.amount.toLocaleString()}đ thành công!`, 'success');
      if (onDataChange) {
        await onDataChange();
      }
      setApprovingPayout(null);
    } catch (err) {
      triggerToast(err.message || 'Không thể thực hiện duyệt thanh toán!', 'danger');
    }
  };

  // 2. Reject Payout
  const handleOpenRejectModal = (payout) => {
    setRejectingPayout(payout);
    setRejectReason('');
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      triggerToast('Vui lòng nhập lý do từ chối thanh toán!', 'warning');
      return;
    }

    try {
      await api.payouts.reject(rejectingPayout.id, rejectReason.trim());
      triggerToast(`Từ chối rút tiền! Đã hoàn trả ${rejectingPayout.amount.toLocaleString()}đ vào ví CTV.`, 'danger');
      if (onDataChange) {
        await onDataChange();
      }
      setRejectingPayout(null);
    } catch (err) {
      triggerToast(err.message || 'Không thể từ chối rút tiền!', 'danger');
    }
  };

  // Filter & Search Logic
  const filteredPayouts = payouts.filter(p => {
    const ctv = collaborators.find(c => c.id === p.ctvId);
    const ctvName = ctv ? ctv.name.toLowerCase() : '';
    const ctvPhone = ctv ? ctv.phone : '';
    
    const matchesTab = filterTab === 'all' || p.status === filterTab;
    const matchesSearch = ctvName.includes(searchQuery.toLowerCase()) || 
                          ctvPhone.includes(searchQuery);
    
    return matchesTab && matchesSearch;
  });

  return (
    <div>
      {/* Search & Filter Tabs */}
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
        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
          <button 
            className={`tab-btn ${filterTab === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterTab('pending')}
          >
            Chờ xử lý ({payouts.filter(p => p.status === 'pending').length})
          </button>
          <button 
            className={`tab-btn ${filterTab === 'paid' ? 'active' : ''}`}
            onClick={() => setFilterTab('paid')}
          >
            Đã thanh toán
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
            placeholder="Tìm theo tên CTV, SĐT..."
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
      </div>

      {/* Payouts Table */}
      <div className="glass-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cộng tác viên</th>
                <th>Thông tin tài khoản nhận</th>
                <th>Số tiền yêu cầu</th>
                <th>Thời gian yêu cầu</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    Không có yêu cầu rút tiền nào ở trạng thái này!
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((pay) => {
                  const ctv = collaborators.find(c => c.id === pay.ctvId);

                  return (
                    <tr key={pay.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                            {ctv ? ctv.name.substring(0, 2).toUpperCase() : 'CTV'}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--text-title)' }}>{ctv ? ctv.name : 'Không rõ'}</strong>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ctv ? ctv.phone : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-title)', fontWeight: '600' }}>
                            <Landmark size={12} style={{ color: 'var(--text-muted)' }} />
                            {pay.bankName}
                          </p>
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>
                            <CreditCard size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>{pay.accountNumber} - <strong>{pay.accountHolder}</strong></span>
                          </p>
                        </div>
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--danger)', fontSize: '0.95rem' }}>
                        {pay.amount.toLocaleString()}đ
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {new Date(pay.requestedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(pay.requestedAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        {pay.status === 'pending' && <span className="badge badge-warning">Chờ chuyển</span>}
                        {pay.status === 'paid' && (
                          <span className="badge badge-success" title={`Mã GD: ${pay.transactionId}`}>
                            Đã thanh toán
                          </span>
                        )}
                        {pay.status === 'rejected' && (
                          <span className="badge badge-danger" title={pay.rejectReason}>
                            Bị từ chối
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          {pay.status === 'pending' ? (
                            <>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenApproveModal(pay)}
                                title="Xác nhận đã chuyển tiền"
                                style={{ padding: '0.35rem 0.6rem' }}
                              >
                                <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                              </button>

                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenRejectModal(pay)}
                                title="Từ chối yêu cầu rút tiền"
                                style={{ padding: '0.35rem 0.6rem' }}
                              >
                                <XCircle size={14} style={{ color: 'var(--danger)' }} />
                              </button>
                            </>
                          ) : pay.status === 'paid' ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <p>Mã GD:</p>
                              <strong>{pay.transactionId}</strong>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--danger)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pay.rejectReason}>
                              {pay.rejectReason}
                            </div>
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

      {/* Payout Approve Modal */}
      {approvingPayout && (() => {
        const ctv = collaborators.find(c => c.id === approvingPayout.ctvId);

        return (
          <Modal
            isOpen={!!approvingPayout}
            onClose={() => setApprovingPayout(null)}
            title="Duyệt chuyển khoản thanh toán"
            footer={
              <>
                <button className="btn btn-secondary" onClick={() => setApprovingPayout(null)}>
                  Hủy
                </button>
                <button className="btn btn-success" onClick={handleConfirmApprove}>
                  Xác nhận đã chuyển khoản
                </button>
              </>
            }
          >
            <form onSubmit={handleConfirmApprove}>
              <div 
                style={{ 
                  background: 'var(--success-bg)', 
                  border: '1px solid var(--success)', 
                  padding: '1rem', 
                  borderRadius: 'var(--border-radius-sm)',
                  color: 'var(--text-title)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cộng tác viên:</span>
                  <strong>{ctv?.name}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Ngân hàng nhận:</span>
                  <strong>{approvingPayout.bankName}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Số tài khoản:</span>
                  <strong>{approvingPayout.accountNumber}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Chủ tài khoản:</span>
                  <strong>{approvingPayout.accountHolder}</strong>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span>Số tiền cần chuyển:</span>
                  <strong style={{ color: 'var(--danger)', fontSize: '1.1rem' }}>{approvingPayout.amount.toLocaleString()}đ</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', color: 'var(--primary)', marginBottom: '1.25rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <strong>Hướng dẫn:</strong> Vui lòng đăng nhập ứng dụng ngân hàng của bạn, quét QR hoặc chuyển khoản thủ công số tiền trên tới CTV. Sau khi chuyển khoản thành công, hãy điền mã giao dịch đối soát ngân hàng vào ô dưới đây để hoàn tất hồ sơ.
                </p>
              </div>

              <div className="form-group">
                <label>Mã giao dịch ngân hàng đối soát *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nhập mã FT, Mã giao dịch, hoặc số bút toán..."
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  required
                />
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* Payout Reject Modal */}
      {rejectingPayout && (
        <Modal
          isOpen={!!rejectingPayout}
          onClose={() => setRejectingPayout(null)}
          title="Từ chối yêu cầu rút tiền"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setRejectingPayout(null)}>
                Hủy
              </button>
              <button className="btn btn-danger" onClick={handleConfirmReject}>
                Xác nhận từ chối rút
              </button>
            </>
          }
        >
          <form onSubmit={handleConfirmReject}>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--danger-bg)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', color: 'var(--danger)', marginBottom: '1.25rem' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                <strong>Lưu ý:</strong> Khi bạn từ chối yêu cầu này, số tiền <strong>{rejectingPayout.amount.toLocaleString()}đ</strong> sẽ được tự động hoàn trả đầy đủ vào ví số dư của CTV.
              </p>
            </div>
            
            <div className="form-group">
              <label>Lý do từ chối yêu cầu rút tiền *</label>
              <textarea
                className="form-control"
                placeholder="Ví dụ: Thông tin ngân hàng không hợp lệ, Số tài khoản không đúng với tên chủ thẻ..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows="4"
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminPayouts;
