import React, { useEffect, useState } from 'react';
import { Bot, Check, Copy, KeyRound, Play, RefreshCw, ShieldCheck, Terminal, Trash2 } from 'lucide-react';

const CollaboratorAgentApi = ({ triggerToast }) => {
  const [copiedText, setCopiedText] = useState('');
  const [status, setStatus] = useState('checking');
  const [statusData, setStatusData] = useState(null);
  const [language, setLanguage] = useState('curl');
  const [agentTokens, setAgentTokens] = useState([]);
  const [newTokenName, setNewTokenName] = useState('AI Agent Local');
  const [selectedScopes, setSelectedScopes] = useState(['tasks:read', 'tasks:write', 'submissions:write', 'wallet:read', 'notifications:read']);
  const [createdToken, setCreatedToken] = useState(null);
  const [authMode, setAuthMode] = useState('jwt');
  const [personalToken, setPersonalToken] = useState('');
  const [consoleEndpoint, setConsoleEndpoint] = useState('status');
  const [consoleTaskId, setConsoleTaskId] = useState('102');
  const [consoleProofUrl, setConsoleProofUrl] = useState('https://github.com/your-name/collabtask/pull/12');
  const [consoleProofText, setConsoleProofText] = useState('AI Agent đã hoàn thành nhiệm vụ và gửi PR nghiệm thu.');
  const [consoleResult, setConsoleResult] = useState(null);
  const [consoleLoading, setConsoleLoading] = useState(false);

  const BASE_URL = `${window.location.origin}/api/ctv-agent`;
  const token = localStorage.getItem('collabtask_token') || '';
  const maskedToken = token ? `${token.slice(0, 18)}••••••••${token.slice(-10)}` : 'Chưa có JWT token';
  const availableScopes = [
    { id: 'tasks:read', label: 'Đọc task/brief' },
    { id: 'tasks:write', label: 'Nhận/hủy task' },
    { id: 'submissions:write', label: 'Nộp proof' },
    { id: 'wallet:read', label: 'Đọc ví' },
    { id: 'notifications:read', label: 'Đọc thông báo' }
  ];
  const consoleEndpoints = {
    status: { label: 'GET /status', method: 'GET', path: '/status' },
    tasks: { label: 'GET /tasks', method: 'GET', path: '/tasks' },
    brief: { label: 'GET /tasks/:id/brief', method: 'GET', path: `/tasks/${consoleTaskId}/brief`, needsTask: true },
    accept: { label: 'POST /tasks/:id/accept', method: 'POST', path: `/tasks/${consoleTaskId}/accept`, needsTask: true },
    submit: { label: 'POST /submissions', method: 'POST', path: '/submissions', needsProof: true },
    wallet: { label: 'GET /wallet', method: 'GET', path: '/wallet' },
    notifications: { label: 'GET /notifications', method: 'GET', path: '/notifications' }
  };

  const handleCopy = async (text, type) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(type);
    triggerToast('Đã sao chép vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedText(''), 2000);
  };

  const getAuthHeaders = (usePersonalToken = authMode === 'personal') => (
    usePersonalToken
      ? { 'x-ctv-agent-token': personalToken }
      : { Authorization: `Bearer ${token}` }
  );

  const loadAgentTokens = async () => {
    try {
      const response = await fetch(`${BASE_URL}/tokens`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAgentTokens(data.data.tokens || []);
      }
    } catch {
      setAgentTokens([]);
    }
  };

  const toggleScope = (scope) => {
    setSelectedScopes(prev => prev.includes(scope) ? prev.filter(item => item !== scope) : [...prev, scope]);
  };

  const createAgentToken = async () => {
    const response = await fetch(`${BASE_URL}/tokens`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTokenName, scopes: selectedScopes })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      triggerToast(data.message || 'Không thể tạo Personal Agent Token.', 'error');
      return;
    }
    setCreatedToken(data.data.token);
    setPersonalToken(data.data.token);
    setAuthMode('personal');
    triggerToast('Đã tạo Personal Agent Token mới.', 'success');
    loadAgentTokens();
  };

  const revokeAgentToken = async (id) => {
    const response = await fetch(`${BASE_URL}/tokens/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      triggerToast(data.message || 'Không thể thu hồi token.', 'error');
      return;
    }
    triggerToast('Đã thu hồi Personal Agent Token.', 'success');
    loadAgentTokens();
  };

  const runConsoleRequest = async () => {
    const endpoint = consoleEndpoints[consoleEndpoint];
    setConsoleLoading(true);
    setConsoleResult(null);
    try {
      const body = endpoint.needsProof ? { taskId: Number(consoleTaskId), proofUrl: consoleProofUrl, proofText: consoleProofText } : null;
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          ...getAuthHeaders(),
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const data = await response.json();
      setConsoleResult({ status: response.status, data });
    } catch (err) {
      setConsoleResult({ status: 'NETWORK_ERROR', data: { message: err.message } });
    } finally {
      setConsoleLoading(false);
    }
  };

  const checkStatus = async () => {
    setStatus('checking');
    try {
      const response = await fetch(`${BASE_URL}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setStatus('online');
        setStatusData(data.data);
      } else {
        setStatus('offline');
      }
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    checkStatus();
    loadAgentTokens();
  }, []);

  const authHeader = language === 'curl'
    ? `-H "Authorization: Bearer ${token || '<JWT_TOKEN>'}"`
    : language === 'js'
      ? `Authorization: 'Bearer ${token || '<JWT_TOKEN>'}'`
      : `"Authorization": "Bearer ${token || '<JWT_TOKEN>'}"`;

  const samplePayload = {
    taskId: 102,
    proofUrl: 'https://github.com/your-name/collabtask/pull/12',
    proofText: 'AI Agent đã hoàn thành nhiệm vụ, chạy test pass và gửi PR nghiệm thu.'
  };

  const makeCode = (method, path, body = null) => {
    const url = `${BASE_URL}${path}`;
    if (language === 'curl') {
      return `curl -X ${method} "${url}" \\\n  ${authHeader}${body ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body, null, 2).replace(/'/g, "'\\''")}'` : ''}`;
    }
    if (language === 'js') {
      return `fetch('${url}', {
  method: '${method}',
  headers: {
    ${authHeader}${body ? `,
    'Content-Type': 'application/json'` : ''}
  }${body ? `,
  body: JSON.stringify(${JSON.stringify(body, null, 2)})` : ''}
})
  .then(res => res.json())
  .then(data => console.log(data));`;
    }
    return `import requests

url = "${url}"
headers = {
    ${authHeader}${body ? ',\n    "Content-Type": "application/json"' : ''}
}${body ? `
payload = ${JSON.stringify(body, null, 4)}
response = requests.${method.toLowerCase()}(url, json=payload, headers=headers)` : `
response = requests.${method.toLowerCase()}(url, headers=headers)`}
print(response.json())`;
  };

  const examples = [
    { id: 'status', title: 'Kiểm tra hồ sơ & trạng thái Agent', method: 'GET', path: '/status', color: '#22c55e' },
    { id: 'tasks', title: 'Lấy nhiệm vụ có thể nhận hoặc đang làm', method: 'GET', path: '/tasks', color: '#3b82f6' },
    { id: 'brief', title: 'Lấy brief chi tiết cho AI Agent', method: 'GET', path: '/tasks/102/brief', color: '#6366f1' },
    { id: 'accept', title: 'Nhận nhiệm vụ theo ID', method: 'POST', path: '/tasks/102/accept', color: '#a855f7' },
    { id: 'submit', title: 'Nộp hoặc nộp lại bằng chứng hoàn thành', method: 'POST', path: '/submissions', body: samplePayload, color: '#10b981' },
    { id: 'wallet', title: 'Xem ví, payouts và ledger giao dịch', method: 'GET', path: '/wallet', color: '#f59e0b' },
    { id: 'notifications', title: 'Đọc thông báo của CTV', method: 'GET', path: '/notifications', color: '#06b6d4' },
    { id: 'read-all', title: 'Đánh dấu tất cả thông báo đã đọc', method: 'PATCH', path: '/notifications/read-all', color: '#64748b' }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-card" style={{
        padding: '2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.16), rgba(124, 58, 237, 0.12))'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'var(--primary)', padding: '0.7rem', borderRadius: '14px', display: 'flex' }}>
              <Bot size={24} color="#fff" />
            </div>
            <h1 style={{ margin: 0, color: 'var(--text-title)', fontSize: '1.75rem' }}>Cổng API AI Agent cho CTV</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '720px' }}>
            Dùng JWT của tài khoản CTV để cho AI Agent nhận nhiệm vụ, nộp PR/proof, đọc ví và theo dõi thông báo mà không có quyền quản trị.
          </p>
        </div>
        <div style={{ minWidth: '220px', padding: '1rem 1.25rem', border: '1px solid var(--border-color)', borderRadius: '16px', background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trạng thái CTV Agent</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', color: 'var(--text-title)', fontWeight: 800 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: status === 'online' ? '#22c55e' : status === 'offline' ? '#ef4444' : '#f59e0b' }} />
            {status === 'online' ? 'ONLINE' : status === 'offline' ? 'OFFLINE' : 'ĐANG KIỂM TRA'}
          </div>
          <button onClick={checkStatus} className="btn btn-outline" style={{ marginTop: '0.75rem', padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}>
            <RefreshCw size={13} className={status === 'checking' ? 'spin-animation' : ''} />
            Kiểm tra lại
          </button>
        </div>
      </div>

      {statusData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'CTV', value: statusData.collaborator?.name },
            { label: 'Task đang nhận', value: statusData.counts?.activeTasks },
            { label: 'Báo cáo chờ duyệt', value: statusData.counts?.pendingSubmissions },
            { label: 'Thông báo chưa đọc', value: statusData.counts?.unreadNotifications },
            { label: 'Số dư ví', value: `${(statusData.balance || 0).toLocaleString('vi-VN')}đ` }
          ].map(item => (
            <div key={item.label} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{item.label}</div>
              <div style={{ color: 'var(--text-title)', fontWeight: 800, fontSize: '1.25rem', marginTop: '0.25rem' }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-title)' }}>
          <KeyRound size={18} color="var(--primary)" />
          Xác thực bằng JWT của CTV
        </h3>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 0 }}>
          CTV Agent API dùng header <code>Authorization: Bearer &lt;JWT_TOKEN&gt;</code>. Không dùng Agent API Key của admin, không có quyền duyệt bài, duyệt payout, reset DB hoặc đọc raw database.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
          <ShieldCheck size={18} color="#22c55e" />
          <code style={{ flex: 1, minWidth: '220px', color: 'var(--text-title)', overflowWrap: 'anywhere' }}>{maskedToken}</code>
          <button className="btn btn-primary" onClick={() => handleCopy(token, 'token')} disabled={!token}>
            {copiedText === 'token' ? <Check size={15} /> : <Copy size={15} />}
            Copy JWT
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-title)' }}>
          <ShieldCheck size={18} color="var(--primary)" />
          Personal Agent Tokens
        </h3>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 0 }}>
          Tạo token riêng cho AI Agent, giới hạn quyền theo scope và có thể thu hồi bất cứ lúc nào. Plain token chỉ hiển thị một lần khi tạo.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <input className="form-control" value={newTokenName} onChange={(e) => setNewTokenName(e.target.value)} placeholder="Tên token" />
          <button className="btn btn-primary" onClick={createAgentToken} disabled={!newTokenName.trim() || selectedScopes.length === 0}>
            <KeyRound size={15} />
            Tạo token
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {availableScopes.map(scope => (
            <button key={scope.id} className={`tab-btn ${selectedScopes.includes(scope.id) ? 'active' : ''}`} onClick={() => toggleScope(scope.id)} style={{ padding: '0.35rem 0.7rem' }}>
              {scope.label}
            </button>
          ))}
        </div>
        {createdToken && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
            <code style={{ flex: 1, minWidth: '220px', color: 'var(--text-title)', overflowWrap: 'anywhere' }}>{createdToken}</code>
            <button className="btn btn-primary" onClick={() => handleCopy(createdToken, 'created-token')}>
              {copiedText === 'created-token' ? <Check size={15} /> : <Copy size={15} />}
              Copy token
            </button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {agentTokens.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chưa có Personal Agent Token.</div>
          ) : agentTokens.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
              <div>
                <div style={{ color: 'var(--text-title)', fontWeight: 800 }}>{item.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                  {item.scopes.join(', ')} · Tạo {new Date(item.createdAt).toLocaleString('vi-VN')} · {item.revokedAt ? 'Đã thu hồi' : item.lastUsedAt ? `Dùng lần cuối ${new Date(item.lastUsedAt).toLocaleString('vi-VN')}` : 'Chưa dùng'}
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => revokeAgentToken(item.id)} disabled={!!item.revokedAt} style={{ padding: '0.45rem 0.7rem' }}>
                <Trash2 size={14} />
                Thu hồi
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-title)' }}>
          <Play size={18} color="var(--primary)" />
          API Console tương tác
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Xác thực
            <select className="form-control" value={authMode} onChange={(e) => setAuthMode(e.target.value)} style={{ marginTop: '0.35rem' }}>
              <option value="jwt">JWT phiên hiện tại</option>
              <option value="personal">Personal Agent Token</option>
            </select>
          </label>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Endpoint
            <select className="form-control" value={consoleEndpoint} onChange={(e) => setConsoleEndpoint(e.target.value)} style={{ marginTop: '0.35rem' }}>
              {Object.entries(consoleEndpoints).map(([id, endpoint]) => <option key={id} value={id}>{endpoint.label}</option>)}
            </select>
          </label>
          <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Task ID
            <input className="form-control" value={consoleTaskId} onChange={(e) => setConsoleTaskId(e.target.value)} style={{ marginTop: '0.35rem' }} />
          </label>
        </div>
        {authMode === 'personal' && (
          <input className="form-control" value={personalToken} onChange={(e) => setPersonalToken(e.target.value)} placeholder="Dán ctvagt_... token" style={{ marginBottom: '1rem' }} />
        )}
        {consoleEndpoints[consoleEndpoint].needsProof && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <input className="form-control" value={consoleProofUrl} onChange={(e) => setConsoleProofUrl(e.target.value)} placeholder="proofUrl" />
            <textarea className="form-control" value={consoleProofText} onChange={(e) => setConsoleProofText(e.target.value)} placeholder="proofText" rows={3} />
          </div>
        )}
        <button className="btn btn-primary" onClick={runConsoleRequest} disabled={consoleLoading || (authMode === 'personal' && !personalToken)}>
          <Play size={15} />
          {consoleLoading ? 'Đang chạy...' : 'Run request'}
        </button>
        {consoleResult && (
          <pre style={{ marginTop: '1rem', padding: '1rem', borderRadius: '10px', overflowX: 'auto', background: 'rgba(0,0,0,0.35)', color: '#bfdbfe', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{JSON.stringify(consoleResult, null, 2)}</pre>
        )}
      </div>

      <div className="glass-card" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-title)' }}>
            <Terminal size={18} color="var(--primary)" />
            Mẫu lệnh cho AI Agent
          </h3>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {['curl', 'js', 'python'].map(item => (
              <button key={item} className={`tab-btn ${language === item ? 'active' : ''}`} onClick={() => setLanguage(item)} style={{ padding: '0.35rem 0.75rem' }}>
                {item === 'js' ? 'JavaScript' : item === 'python' ? 'Python' : 'cURL'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {examples.map(example => {
            const code = makeCode(example.method, example.path, example.body);
            return (
              <div key={example.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', color: 'var(--text-title)', fontWeight: 800 }}>
                  <span className="badge" style={{ background: `${example.color}22`, color: example.color }}>{example.method}</span>
                  {example.title}
                </div>
                <div style={{ position: 'relative' }}>
                  <pre style={{ margin: 0, padding: '1rem 3.25rem 1rem 1rem', borderRadius: '10px', overflowX: 'auto', background: 'rgba(0,0,0,0.35)', color: '#bfdbfe', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{code}</pre>
                  <button className="btn btn-outline" onClick={() => handleCopy(code, example.id)} style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', padding: '0.35rem' }} title="Copy command">
                    {copiedText === example.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorAgentApi;
