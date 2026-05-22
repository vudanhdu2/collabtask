import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Key, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  Database, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Cpu, 
  Code,
  FileCode,
  Flame
} from 'lucide-react';

const AdminAgentApi = ({ triggerToast }) => {
  const [showKey, setShowKey] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [apiStatus, setApiStatus] = useState('unknown'); // 'unknown', 'checking', 'online', 'offline'
  const [statusData, setStatusData] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('curl'); // 'curl', 'js', 'python'

  // Task generator state
  const [taskTitle, setTaskTitle] = useState('Viết Unit Test cho Auth Controller');
  const [taskReward, setTaskReward] = useState('250000');
  const [taskPlatform, setTaskPlatform] = useState('NodeJS');
  const [taskDesc, setTaskDesc] = useState('Viết tối thiểu 5 test cases bằng Jest bao phủ 100% các nhánh xử lý lỗi.');

  const API_KEY = 'collabtask-agent-super-secret-key-2026';
  const BASE_URL = 'http://localhost:3001/api/agent';

  // Automatically check API status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    triggerToast('Đã sao chép mã nguồn vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedText(''), 2000);
  };

  const checkConnection = async () => {
    setApiStatus('checking');
    try {
      const response = await fetch(`${BASE_URL}/status`, {
        headers: {
          'x-agent-api-key': API_KEY
        }
      });
      if (response.status === 200) {
        const data = await response.json();
        setApiStatus('online');
        setStatusData(data.counts);
      } else {
        setApiStatus('offline');
      }
    } catch (err) {
      setApiStatus('offline');
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn RESET toàn bộ cơ sở dữ liệu về trạng thái mẫu ban đầu không? Dữ liệu hiện tại sẽ bị ghi đè.')) {
      return;
    }
    
    try {
      const response = await fetch(`${BASE_URL}/seed`, {
        method: 'POST',
        headers: {
          'x-agent-api-key': API_KEY
        }
      });
      const data = await response.json();
      if (data.success) {
        triggerToast('Reset cơ sở dữ liệu và nạp dữ liệu mẫu thành công!', 'success');
        checkConnection();
      } else {
        triggerToast(data.message || 'Lỗi khi reset database.', 'danger');
      }
    } catch (err) {
      triggerToast('Không thể kết nối đến API Server.', 'danger');
    }
  };

  // Generate dynamic request code based on form inputs
  const getTaskPayload = () => {
    return {
      title: taskTitle,
      reward: Number(taskReward),
      platform: taskPlatform,
      description: taskDesc
    };
  };

  const generateCreateTaskCode = () => {
    const payload = getTaskPayload();
    if (selectedLanguage === 'curl') {
      return `curl -X POST "${BASE_URL}/tasks" \\
  -H "x-agent-api-key: ${API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2).replace(/'/g, "'\\''")}'`;
    } else if (selectedLanguage === 'js') {
      return `fetch('${BASE_URL}/tasks', {
  method: 'POST',
  headers: {
    'x-agent-api-key': '${API_KEY}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${JSON.stringify(payload, null, 2)})
})
.then(res => res.json())
.then(data => console.log('Đã tạo nhiệm vụ:', data))
.catch(err => console.error('Lỗi:', err));`;
    } else {
      return `import requests

url = "${BASE_URL}/tasks"
headers = {
    "x-agent-api-key": "${API_KEY}",
    "Content-Type": "application/json"
}
payload = ${JSON.stringify(payload, null, 4)}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;
    }
  };

  const generateGetStatusCode = () => {
    if (selectedLanguage === 'curl') {
      return `curl -X GET "${BASE_URL}/status" \\
  -H "x-agent-api-key: ${API_KEY}"`;
    } else if (selectedLanguage === 'js') {
      return `fetch('${BASE_URL}/status', {
  headers: {
    'x-agent-api-key': '${API_KEY}'
  }
})
.then(res => res.json())
.then(data => console.log('Stats:', data));`;
    } else {
      return `import requests

url = "${BASE_URL}/status"
headers = { "x-agent-api-key": "${API_KEY}" }

response = requests.get(url, headers=headers)
print(response.json())`;
    }
  };

  const generateReviewSubCode = (subId = 1, action = 'approve') => {
    const payload = action === 'approve' ? { action } : { action, rejectReason: 'Code chạy bị lỗi crash hoặc thiếu tài liệu nghiệm thu.' };
    if (selectedLanguage === 'curl') {
      return `curl -X POST "${BASE_URL}/submissions/${subId}/review" \\
  -H "x-agent-api-key: ${API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
    } else if (selectedLanguage === 'js') {
      return `fetch('${BASE_URL}/submissions/${subId}/review', {
  method: 'POST',
  headers: {
    'x-agent-api-key': '${API_KEY}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(${JSON.stringify(payload, null, 2)})
})
.then(res => res.json())
.then(data => console.log('Kết quả duyệt:', data));`;
    } else {
      return `import requests

url = "${BASE_URL}/submissions/${subId}/review"
headers = {
    "x-agent-api-key": "${API_KEY}",
    "Content-Type": "application/json"
}
payload = ${JSON.stringify(payload, null, 4)}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Header Banner Glassmorphism */}
      <div className="glass-card" style={{
        position: 'relative',
        padding: '2.5rem',
        background: 'linear-gradient(135deg, rgba(30, 20, 50, 0.6) 0%, rgba(10, 10, 20, 0.8) 100%)',
        border: '1px solid rgba(138, 43, 226, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        overflow: 'hidden'
      }}>
        {/* Animated Glow in background */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(138, 43, 226, 0.2) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }} />
        
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)',
              padding: '0.6rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(138, 43, 226, 0.4)'
            }}>
              <Cpu size={24} style={{ color: '#fff' }} />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, #ffffff, #d8b4fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Cổng lập trình viên & Agent Coding API
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '650px', margin: 0, lineHeight: '1.5' }}>
            Điều khiển toàn bộ hệ thống Admin CollabTask thông qua giao thức API. Phù hợp cho AI Agent, CI/CD pipelines hoặc kịch bản tự động hóa từ bên ngoài.
          </p>
        </div>

        {/* Real-time Status Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          minWidth: '200px'
        }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', tracking: '0.1em', color: 'var(--text-muted)' }}>Trạng thái Gateway</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 
                apiStatus === 'online' ? '#22c55e' : 
                apiStatus === 'offline' ? '#ef4444' : 
                apiStatus === 'checking' ? '#f59e0b' : '#6b7280',
              boxShadow: 
                apiStatus === 'online' ? '0 0 10px #22c55e' : 
                apiStatus === 'offline' ? '0 0 10px #ef4444' : 
                apiStatus === 'checking' ? '0 0 10px #f59e0b' : 'none',
              animation: apiStatus === 'checking' ? 'pulse 1.2s infinite' : 'none'
            }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-title)' }}>
              {apiStatus === 'online' && 'ONLINE'}
              {apiStatus === 'offline' && 'OFFLINE'}
              {apiStatus === 'checking' && 'ĐANG KẾT NỐI...'}
              {apiStatus === 'unknown' && 'CHƯA KIỂM TRA'}
            </span>
          </div>
          <button 
            onClick={checkConnection} 
            className="btn btn-outline" 
            style={{ 
              padding: '0.35rem 0.75rem', 
              fontSize: '0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.25rem',
              marginTop: '0.25rem' 
            }}
          >
            <RefreshCw size={12} className={apiStatus === 'checking' ? 'spin-animation' : ''} />
            <span>Kiểm tra lại</span>
          </button>
        </div>
      </div>

      {/* 2. Top-Level Summary Stats if Connected */}
      {apiStatus === 'online' && statusData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
          {[
            { label: 'Nhiệm vụ', val: statusData.tasks, color: '#a855f7' },
            { label: 'Cộng tác viên', val: statusData.collaborators, color: '#3b82f6' },
            { label: 'Báo cáo nộp bài', val: statusData.submissions, color: '#eab308' },
            { label: 'Yêu cầu thanh toán', val: statusData.payouts, color: '#10b981' }
          ].map((item, idx) => (
            <div key={idx} className="glass-card" style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              borderLeft: `4px solid ${item.color}`,
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</span>
              <span style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-title)' }}>{item.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* 3. API Key Manager Card */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-title)', fontSize: '1.2rem' }}>
          <Key size={18} style={{ color: 'var(--primary)' }} />
          <span>Mã khóa Xác thực bảo mật (Agent API Key)</span>
        </h3>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Tất cả yêu cầu gửi tới các Endpoint bên dưới bắt buộc phải đính kèm Header <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.3rem', borderRadius: '4px', color: '#ec4899' }}>x-agent-api-key</code> hoặc Bearer Token chứa giá trị khóa này để xác minh quyền quản trị.
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '0.75rem 1.25rem',
          maxWidth: '650px'
        }}>
          <ShieldCheck size={20} style={{ color: '#22c55e' }} />
          
          <div style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.95rem', color: showKey ? '#e2e8f0' : '#64748b', userSelect: showKey ? 'all' : 'none' }}>
            {showKey ? API_KEY : '••••••••••••••••••••••••••••••••••••••••••••'}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setShowKey(!showKey)} 
              className="btn btn-outline" 
              style={{ padding: '0.4rem', borderRadius: '8px' }}
              title={showKey ? "Ẩn khóa" : "Hiển thị khóa"}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button 
              onClick={() => handleCopy(API_KEY, 'key')} 
              className="btn btn-primary" 
              style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {copiedText === 'key' ? <Check size={16} /> : <Copy size={16} />}
              <span>Copy</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Interactive Explorer & Code Playground */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Section Playground */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-title)', fontSize: '1.2rem' }}>
              <Code size={18} style={{ color: 'var(--primary)' }} />
              <span>Thư viện mẫu & Sinh lệnh điều khiển nhanh</span>
            </h3>
            
            {/* Language Switcher */}
            <div className="glass-card" style={{ display: 'flex', gap: '0.25rem', padding: '0.25rem', borderRadius: '8px', background: 'rgba(0,0,0,0.15)' }}>
              {[
                { id: 'curl', label: 'cURL Terminal' },
                { id: 'js', label: 'JavaScript' },
                { id: 'python', label: 'Python' }
              ].map(lang => (
                <button
                  key={lang.id}
                  className={`tab-btn ${selectedLanguage === lang.id ? 'active' : ''}`}
                  onClick={() => setSelectedLanguage(lang.id)}
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Lệnh 1: Lấy thông tin hệ thống */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-title)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>GET</span>
                <span>Kiểm tra trạng thái hệ thống và Thống kê</span>
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Đọc nhanh số lượng thực thể đang hoạt động trong database của hệ thống.
              </p>
              
              <div style={{ position: 'relative' }}>
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '1rem 3.5rem 1rem 1rem',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  overflowX: 'auto',
                  color: '#93c5fd',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}>
                  {generateGetStatusCode()}
                </pre>
                <button
                  onClick={() => handleCopy(generateGetStatusCode(), 'status-code')}
                  className="btn btn-outline"
                  style={{ position: 'absolute', right: '10px', top: '10px', padding: '0.35rem', borderRadius: '6px' }}
                  title="Copy command"
                >
                  {copiedText === 'status-code' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Lệnh 2: Tạo nhiệm vụ mẫu tự động */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-title)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-warning" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>POST</span>
                <span>Tạo nhiệm vụ công việc mới</span>
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tiêu đề nhiệm vụ</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={taskTitle} 
                    onChange={e => setTaskTitle(e.target.value)} 
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Thù lao (VND)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={taskReward} 
                    onChange={e => setTaskReward(e.target.value)} 
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Công nghệ/Nền tảng</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={taskPlatform} 
                    onChange={e => setTaskPlatform(e.target.value)} 
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Mô tả ngắn</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={taskDesc} 
                    onChange={e => setTaskDesc(e.target.value)} 
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} 
                  />
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '1rem 3.5rem 1rem 1rem',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  overflowX: 'auto',
                  color: '#c084fc',
                  border: '1px solid rgba(255,255,255,0.03)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {generateCreateTaskCode()}
                </pre>
                <button
                  onClick={() => handleCopy(generateCreateTaskCode(), 'create-code')}
                  className="btn btn-outline"
                  style={{ position: 'absolute', right: '10px', top: '10px', padding: '0.35rem', borderRadius: '6px' }}
                  title="Copy command"
                >
                  {copiedText === 'create-code' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Lệnh 3: Duyệt báo cáo PR tự động */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-title)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-warning" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>POST</span>
                <span>Phê duyệt báo cáo nộp bài của CTV (Giải ngân tức thì)</span>
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                Hành động này lập tức đổi trạng thái bài làm sang <code style={{ color: '#22c55e' }}>approved</code> và cộng thù lao tương ứng trực tiếp vào ví của CTV.
              </p>
              
              <div style={{ position: 'relative' }}>
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '1rem 3.5rem 1rem 1rem',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  overflowX: 'auto',
                  color: '#a7f3d0',
                  border: '1px solid rgba(255,255,255,0.03)'
                }}>
                  {generateReviewSubCode(1, 'approve')}
                </pre>
                <button
                  onClick={() => handleCopy(generateReviewSubCode(1, 'approve'), 'review-code')}
                  className="btn btn-outline"
                  style={{ position: 'absolute', right: '10px', top: '10px', padding: '0.35rem', borderRadius: '6px' }}
                  title="Copy command"
                >
                  {copiedText === 'review-code' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* 5. Danger Zone - Seed / DB Overwrite */}
        <div className="glass-card" style={{ 
          padding: '2rem', 
          border: '1px solid rgba(239, 68, 68, 0.25)', 
          background: 'linear-gradient(135deg, rgba(20, 10, 10, 0.5) 0%, rgba(10, 10, 10, 0.8) 100%)' 
        }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontSize: '1.2rem' }}>
            <Flame size={20} style={{ color: '#ef4444' }} />
            <span>Khu vực cực kỳ nguy hiểm (Danger Zone)</span>
          </h3>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Cung cấp khả năng xóa sạch các bản ghi hiện tại và ghi đè trạng thái. Hãy cẩn trọng khi thực hiện các API này trên môi trường phát triển thực tế của nhóm.
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '1.25rem 1.5rem',
            borderRadius: '12px'
          }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-title)', fontSize: '0.95rem' }}>Khởi động lại toàn bộ Cơ sở dữ liệu về ban đầu</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>Đưa toàn bộ người dùng, nhiệm vụ, thù lao, ví của CTV về trạng thái mock data sạch ban đầu.</p>
            </div>
            <button 
              onClick={handleResetDatabase} 
              className="btn btn-primary" 
              style={{ 
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                border: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)'
              }}
            >
              <Database size={16} />
              <span>Reset & Seed Database</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminAgentApi;
