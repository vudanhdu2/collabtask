const API_BASE = '/api';

// Hàm gửi request HTTP chung có gắn JWT token
const request = async (url, options = {}) => {
  const token = localStorage.getItem('collabtask_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (err) {
      console.error('Lỗi parse JSON phản hồi:', err);
      throw new Error('Phản hồi từ Server không đúng định dạng JSON hợp lệ.', { cause: err });
    }
  } else {
    const text = await response.text();
    // Nếu là trang lỗi proxy của Vite hoặc server bị sập
    if (text.includes('Vite') || text.includes('Gateway') || text.includes('The server')) {
      throw new Error('Không thể kết nối đến API Server. Vui lòng đảm bảo Server Node đang chạy.');
    }
    throw new Error(text || `Yêu cầu thất bại với mã trạng thái ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(data.message || 'Có lỗi xảy ra khi kết nối server.');
  }

  return data;
};

// HTTP methods
const get = (url, options) => request(url, { method: 'GET', ...options });
const post = (url, body, options) => request(url, { method: 'POST', body: JSON.stringify(body), ...options });
const put = (url, body, options) => request(url, { method: 'PUT', body: JSON.stringify(body), ...options });
const patch = (url, body, options) => request(url, { method: 'PATCH', body: JSON.stringify(body), ...options });
const del = (url, options) => request(url, { method: 'DELETE', ...options });

export const api = {
  // Authentication APIs
  auth: {
    login: async (username, password) => {
      const data = await post('/auth/login', { username, password });
      if (data.token) {
        localStorage.setItem('collabtask_token', data.token);
      }
      return data;
    },
    register: (regData) => post('/auth/register', regData),
    me: () => get('/auth/me'),
    logout: () => {
      localStorage.removeItem('collabtask_token');
    }
  },

  // Collaborators APIs
  collaborators: {
    list: () => get('/collaborators'),
    create: (data) => post('/collaborators', data),
    toggleStatus: (id, status) => patch(`/collaborators/${id}/status`, { status }),
    delete: (id) => del(`/collaborators/${id}`),
    leaderboard: () => get('/collaborators/leaderboard'),
  },

  // Tasks APIs
  tasks: {
    list: () => get('/tasks'),
    create: (data) => post('/tasks', data),
    update: (id, data) => put(`/tasks/${id}`, data),
    toggleStatus: (id, status) => patch(`/tasks/${id}/status`, { status }),
    delete: (id) => del(`/tasks/${id}`),
    accept: (id) => post(`/tasks/${id}/accept`, {}),
    cancel: (id) => post(`/tasks/${id}/cancel`, {}),
  },

  // Submissions (Báo cáo nộp) APIs
  submissions: {
    list: () => get('/submissions'),
    create: (data) => post('/submissions', data),
    approve: (id) => patch(`/submissions/${id}/approve`, {}),
    reject: (id, rejectReason) => patch(`/submissions/${id}/reject`, { rejectReason }),
    requestRevision: (id, revisionReason) => patch(`/submissions/${id}/request-revision`, { revisionReason }),
  },

  // Payouts (Rút tiền) APIs
  payouts: {
    list: () => get('/payouts'),
    create: (data) => post('/payouts', data),
    pay: (id, transactionId) => patch(`/payouts/${id}/pay`, { transactionId }),
    reject: (id, rejectReason) => patch(`/payouts/${id}/reject`, { rejectReason }),
    transactions: () => get('/payouts/transactions'),
  },

  // Webhook Logs API
  webhook: {
    getLogs: () => get('/webhook/github/logs'),
  },

  activity: {
    list: () => get('/activity'),
  },

  notifications: {
    list: () => get('/notifications'),
    markRead: (id) => patch(`/notifications/${id}/read`, {}),
    markAllRead: () => patch('/notifications/read-all', {}),
  },

  // Documents API
  docs: {
    download: async (filename) => {
      const token = localStorage.getItem('collabtask_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE}/docs/download/${filename}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        let errorMsg = 'Tải tài liệu thất bại.';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch {
          errorMsg = response.statusText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    }
  }
};
