import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { readDb, writeDb, getNextId, getLevelInfo, normalizeTaskLifecycle, addActivityLog, addNotification } from '../db.js';

dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'collabtask-secret-key-2026-production';
const DEFAULT_AGENT_SCOPES = ['tasks:read', 'tasks:write', 'submissions:write', 'wallet:read', 'notifications:read'];
const ALL_AGENT_SCOPES = [...DEFAULT_AGENT_SCOPES];

const hashAgentToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const sanitizeScopes = (scopes = DEFAULT_AGENT_SCOPES) => {
  const requestedScopes = Array.isArray(scopes) ? scopes : DEFAULT_AGENT_SCOPES;
  return [...new Set(requestedScopes.filter(scope => ALL_AGENT_SCOPES.includes(scope)))];
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  return scheme === 'Bearer' ? token : '';
};

const authenticateAgentToken = (req, res, next, token) => {
  const db = readDb();
  const tokenHash = hashAgentToken(token);
  const tokenRecord = (db.agentTokens || []).find(item => item.tokenHash === tokenHash);

  if (!tokenRecord || tokenRecord.revokedAt) {
    return res.status(403).json({ success: false, message: 'Personal Agent Token không hợp lệ hoặc đã bị thu hồi.' });
  }

  const collaborator = db.collaborators.find(c => c.id === tokenRecord.ctvId);
  if (!collaborator || collaborator.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Hồ sơ CTV không còn hợp lệ để dùng Agent Token.' });
  }

  tokenRecord.lastUsedAt = new Date().toISOString();
  writeDb(db);
  req.user = { role: 'collaborator', ctvId: tokenRecord.ctvId, agentTokenId: tokenRecord.id };
  req.agentScopes = tokenRecord.scopes || [];
  req.authMethod = 'agent-token';
  next();
};

const verifyCollaboratorAgent = (req, res, next) => {
  const personalToken = req.headers['x-ctv-agent-token'] || getBearerToken(req);
  if (typeof personalToken === 'string' && personalToken.startsWith('ctvagt_')) {
    return authenticateAgentToken(req, res, next, personalToken);
  }

  const jwtToken = getBearerToken(req);
  if (!jwtToken) {
    return res.status(401).json({ success: false, message: 'Không tìm thấy mã xác thực token.' });
  }

  try {
    const decoded = jwt.verify(jwtToken, JWT_SECRET);
    const db = readDb();
    const userExists = db.users.find(u => u.id === decoded.id);
    if (!userExists) {
      return res.status(403).json({ success: false, message: 'Tài khoản không tồn tại trên hệ thống.' });
    }
    if (decoded.role !== 'collaborator' || !decoded.ctvId) {
      return res.status(403).json({
        success: false,
        message: 'CTV Agent API chỉ dành cho tài khoản cộng tác viên.'
      });
    }
    req.user = decoded;
    req.agentScopes = ALL_AGENT_SCOPES;
    req.authMethod = 'jwt';
    next();
  } catch {
    return res.status(403).json({ success: false, message: 'Mã token hết hạn hoặc không hợp lệ.' });
  }
};

const requireAgentScope = (scope) => (req, res, next) => {
  if (req.authMethod === 'jwt' || (req.agentScopes || []).includes(scope)) {
    return next();
  }
  return res.status(403).json({ success: false, message: `Agent Token thiếu quyền ${scope}.` });
};

const toTokenMetadata = (token) => ({
  id: token.id,
  ctvId: token.ctvId,
  name: token.name,
  scopes: token.scopes || [],
  lastUsedAt: token.lastUsedAt || null,
  revokedAt: token.revokedAt || null,
  createdAt: token.createdAt
});

const agentResponse = (res, data, message, status = 200, nextActions = []) => {
  res.status(status).json({
    success: true,
    message,
    data,
    nextActions
  });
};

const getVisibleNotifications = (db, ctvId) => (
  (db.notifications || []).filter(n => n.recipientRole === 'collaborator' && n.recipientCtvId === ctvId)
);

const getTaskBrief = (task) => {
  const taskCode = task.taskCode || `task-${task.id}`;
  const acceptanceCriteria = [
    ...(Array.isArray(task.kpis) ? task.kpis : []),
    task.requirements
  ].filter(Boolean);
  const suggestedBranch = `${task.platform?.toLowerCase().includes('markdown') ? 'docs' : 'feature'}/${taskCode}-${task.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}`;
  const markdownBrief = `# ${taskCode}: ${task.title}\n\n## Mục tiêu\n${task.description || task.requirements || ''}\n\n## Yêu cầu nghiệm thu\n${acceptanceCriteria.map(item => `- ${item}`).join('\n')}\n\n## Hướng dẫn\n${(task.instructions || []).map(item => `- ${item}`).join('\n')}\n\n## Nộp bài\nPOST /api/ctv-agent/submissions với taskId=${task.id}, proofUrl và proofText.`;

  return {
    id: task.id,
    taskCode,
    title: task.title,
    goal: task.description || '',
    reward: task.reward,
    platform: task.platform,
    deadline: task.deadline,
    requirements: task.requirements || '',
    kpis: task.kpis || [],
    technicalRequirements: task.technicalRequirements || [],
    instructions: task.instructions || [],
    milestones: task.milestones || [],
    githubRepo: task.githubRepo || '',
    githubBranch: task.githubBranch || '',
    acceptanceCriteria,
    submitEndpoint: '/api/ctv-agent/submissions',
    suggestedBranch,
    markdownBrief
  };
};

router.use(verifyCollaboratorAgent);

router.get('/tokens', (req, res) => {
  if (req.authMethod !== 'jwt') {
    return res.status(403).json({ success: false, message: 'Chỉ phiên đăng nhập CTV mới được quản lý Personal Agent Token.' });
  }

  const db = readDb();
  const tokens = (db.agentTokens || [])
    .filter(token => token.ctvId === req.user.ctvId)
    .map(toTokenMetadata);
  agentResponse(res, { tokens }, 'Danh sách Personal Agent Token của CTV hiện tại.');
});

router.post('/tokens', (req, res) => {
  if (req.authMethod !== 'jwt') {
    return res.status(403).json({ success: false, message: 'Chỉ phiên đăng nhập CTV mới được tạo Personal Agent Token.' });
  }

  const db = readDb();
  const collaborator = db.collaborators.find(c => c.id === req.user.ctvId);
  if (!collaborator) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ CTV.' });
  }

  const token = `ctvagt_${crypto.randomBytes(32).toString('base64url')}`;
  const now = new Date().toISOString();
  const tokenRecord = {
    id: getNextId('agentTokens'),
    ctvId: req.user.ctvId,
    name: (req.body.name || 'CTV Agent Token').trim().slice(0, 80),
    tokenHash: hashAgentToken(token),
    scopes: sanitizeScopes(req.body.scopes),
    lastUsedAt: null,
    revokedAt: null,
    createdAt: now
  };

  db.agentTokens = db.agentTokens || [];
  db.agentTokens.unshift(tokenRecord);
  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'ctv_agent_token_created',
    entityType: 'agentToken',
    entityId: tokenRecord.id,
    message: `${collaborator.name} đã tạo Personal Agent Token: ${tokenRecord.name}`,
    metadata: { ctvId: req.user.ctvId, scopes: tokenRecord.scopes }
  });
  writeDb(db);

  agentResponse(res, { token, tokenInfo: toTokenMetadata(tokenRecord) }, 'Personal Agent Token đã được tạo. Token chỉ hiển thị một lần, hãy lưu lại ngay.', 201);
});

router.delete('/tokens/:id', (req, res) => {
  if (req.authMethod !== 'jwt') {
    return res.status(403).json({ success: false, message: 'Chỉ phiên đăng nhập CTV mới được thu hồi Personal Agent Token.' });
  }

  const id = Number(req.params.id);
  const db = readDb();
  const tokenRecord = (db.agentTokens || []).find(token => token.id === id && token.ctvId === req.user.ctvId);
  if (!tokenRecord) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy Personal Agent Token.' });
  }

  tokenRecord.revokedAt = tokenRecord.revokedAt || new Date().toISOString();
  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'ctv_agent_token_revoked',
    entityType: 'agentToken',
    entityId: tokenRecord.id,
    message: `CTV đã thu hồi Personal Agent Token: ${tokenRecord.name}`,
    metadata: { ctvId: req.user.ctvId }
  });
  writeDb(db);
  agentResponse(res, { token: toTokenMetadata(tokenRecord) }, 'Personal Agent Token đã được thu hồi.');
});

router.get('/status', requireAgentScope('tasks:read'), (req, res) => {
  const db = readDb();
  const ctvId = req.user.ctvId;
  const collaborator = db.collaborators.find(c => c.id === ctvId);

  if (!collaborator) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ CTV.' });
  }

  const myTasks = db.tasks.filter(t => t.assignedCtvId === ctvId);
  const mySubmissions = db.submissions.filter(s => s.ctvId === ctvId);
  const myNotifications = getVisibleNotifications(db, ctvId);

  agentResponse(res, {
    collaborator,
    counts: {
      assignedTasks: myTasks.length,
      activeTasks: myTasks.filter(t => t.status === 'active').length,
      submissions: mySubmissions.length,
      pendingSubmissions: mySubmissions.filter(s => s.status === 'pending').length,
      unreadNotifications: myNotifications.filter(n => !n.readAt).length
    },
    balance: collaborator.balance || 0
  }, 'CTV Agent API sẵn sàng.');
});

router.get('/tasks', requireAgentScope('tasks:read'), (req, res) => {
  const db = readDb();
  const ctvId = req.user.ctvId;
  const tasks = db.tasks
    .filter(task => (
      task.status === 'active' &&
      (task.assignedCtvId === null || task.assignedCtvId === undefined || task.assignedCtvId === ctvId)
    ))
    .map(task => normalizeTaskLifecycle(task, db.submissions || []));

  agentResponse(res, { tasks }, 'Danh sách nhiệm vụ CTV Agent có thể xử lý.', 200, [
    'GET /api/ctv-agent/tasks/:id/brief để lấy brief chi tiết cho AI Agent.',
    'POST /api/ctv-agent/tasks/:id/accept để nhận nhiệm vụ chưa có người nhận.',
    'POST /api/ctv-agent/submissions để nộp bằng chứng cho nhiệm vụ đã nhận.'
  ]);
});

router.get('/tasks/:id/brief', requireAgentScope('tasks:read'), (req, res) => {
  const id = Number(req.params.id);
  const ctvId = req.user.ctvId;
  const db = readDb();
  const task = db.tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ.' });
  }

  if (task.status !== 'active' || (task.assignedCtvId !== null && task.assignedCtvId !== undefined && task.assignedCtvId !== ctvId)) {
    return res.status(403).json({ success: false, message: 'CTV Agent không có quyền xem brief nhiệm vụ này.' });
  }

  const normalizedTask = normalizeTaskLifecycle(task, db.submissions || []);
  agentResponse(res, { brief: getTaskBrief(normalizedTask) }, 'Brief nhiệm vụ đã sẵn sàng cho AI Agent.', 200, [
    `POST /api/ctv-agent/tasks/${task.id}/accept nếu nhiệm vụ chưa được nhận.`,
    'POST /api/ctv-agent/submissions để nộp proofUrl/proofText sau khi hoàn thành.'
  ]);
});

router.post('/tasks/:id/accept', requireAgentScope('tasks:write'), (req, res) => {
  const id = Number(req.params.id);
  const ctvId = req.user.ctvId;
  const db = readDb();
  const task = db.tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ.' });
  }

  if (task.status !== 'active') {
    return res.status(400).json({ success: false, message: 'Nhiệm vụ này không còn hoạt động để nhận.' });
  }

  if (task.assignedCtvId !== undefined && task.assignedCtvId !== null) {
    return res.status(400).json({ success: false, message: 'Nhiệm vụ này đã được nhận bởi một CTV khác.' });
  }

  const collaborator = db.collaborators.find(c => c.id === ctvId);
  if (!collaborator) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ CTV.' });
  }

  const levelInfo = getLevelInfo(collaborator.exp || 0);
  const activeJobsCount = db.tasks.filter(t => t.assignedCtvId === ctvId && t.status === 'active').length;
  if (activeJobsCount >= levelInfo.maxJobs) {
    return res.status(400).json({
      success: false,
      message: `Bạn đã đạt giới hạn nhận việc tối đa của cấp ${levelInfo.level}: ${levelInfo.maxJobs} việc.`
    });
  }

  task.assignedCtvId = ctvId;
  task.acceptedAt = new Date().toISOString();
  task.cancelledAt = null;
  task.lastActivityAt = task.acceptedAt;
  task.taskCode = task.taskCode || `task-${task.id}`;

  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'ctv_agent_task_accepted',
    entityType: 'task',
    entityId: task.id,
    message: `${collaborator.name} đã nhận nhiệm vụ qua CTV Agent API: ${task.title}`,
    metadata: { ctvId, taskCode: task.taskCode }
  });
  addNotification(db, {
    recipientRole: 'admin',
    type: 'ctv_agent_task_accepted',
    title: 'CTV Agent nhận nhiệm vụ',
    message: `${collaborator.name} đã nhận nhiệm vụ #${task.id} qua Agent API`,
    entityType: 'task',
    entityId: task.id
  });

  writeDb(db);
  agentResponse(res, { task }, 'CTV Agent đã nhận nhiệm vụ thành công.', 200, [
    'POST /api/ctv-agent/submissions để nộp proofUrl/proofText khi hoàn thành.'
  ]);
});

router.post('/tasks/:id/cancel', requireAgentScope('tasks:write'), (req, res) => {
  const id = Number(req.params.id);
  const ctvId = req.user.ctvId;
  const db = readDb();
  const task = db.tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ.' });
  }

  if (task.assignedCtvId !== ctvId) {
    return res.status(403).json({ success: false, message: 'CTV Agent không thể hủy nhiệm vụ không thuộc CTV hiện tại.' });
  }

  const hasApprovedSubmission = db.submissions.some(s => s.taskId === id && s.ctvId === ctvId && s.status === 'approved');
  if (hasApprovedSubmission || task.status === 'completed') {
    return res.status(400).json({ success: false, message: 'Nhiệm vụ đã hoàn thành hoặc có bài được duyệt, không thể hủy.' });
  }

  const collaborator = db.collaborators.find(c => c.id === ctvId);
  task.assignedCtvId = null;
  task.cancelledAt = new Date().toISOString();
  task.lastActivityAt = task.cancelledAt;

  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'ctv_agent_task_cancelled',
    entityType: 'task',
    entityId: task.id,
    message: `${collaborator?.name || 'CTV'} đã hủy nhiệm vụ qua CTV Agent API: ${task.title}`,
    metadata: { ctvId }
  });
  addNotification(db, {
    recipientRole: 'admin',
    type: 'ctv_agent_task_cancelled',
    title: 'CTV Agent hủy nhiệm vụ',
    message: `${collaborator?.name || 'CTV'} đã hủy nhiệm vụ #${task.id} qua Agent API`,
    entityType: 'task',
    entityId: task.id
  });

  writeDb(db);
  agentResponse(res, { task }, 'CTV Agent đã hủy nhận nhiệm vụ thành công.');
});

router.get('/submissions', requireAgentScope('tasks:read'), (req, res) => {
  const db = readDb();
  const submissions = db.submissions.filter(s => s.ctvId === req.user.ctvId);
  agentResponse(res, { submissions }, 'Danh sách báo cáo của CTV hiện tại.');
});

router.post('/submissions', requireAgentScope('submissions:write'), (req, res) => {
  const { taskId, proofUrl, proofText } = req.body;
  const ctvId = req.user.ctvId;

  if (!taskId || !proofUrl) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp taskId và proofUrl.' });
  }

  const db = readDb();
  const task = db.tasks.find(t => t.id === Number(taskId));
  if (!task) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy nhiệm vụ tương ứng.' });
  }

  if (task.status !== 'active') {
    return res.status(400).json({ success: false, message: 'Nhiệm vụ này đã tạm đóng hoặc kết thúc.' });
  }

  if (task.assignedCtvId !== ctvId) {
    return res.status(403).json({ success: false, message: 'CTV Agent chỉ được nộp báo cáo cho nhiệm vụ đã nhận bởi chính CTV hiện tại.' });
  }

  const collaborator = db.collaborators.find(c => c.id === ctvId);
  const existingSubmission = db.submissions.find(s => (
    s.taskId === Number(taskId) &&
    s.ctvId === ctvId &&
    s.status === 'revision_requested'
  ));

  if (existingSubmission) {
    existingSubmission.proofUrl = proofUrl;
    existingSubmission.proofText = proofText || '';
    existingSubmission.status = 'pending';
    existingSubmission.revisionSubmittedAt = new Date().toISOString();
    existingSubmission.reviewHistory = existingSubmission.reviewHistory || [];
    existingSubmission.reviewHistory.push({
      action: 'agent_resubmitted',
      note: proofText || 'CTV Agent đã nộp lại báo cáo sau yêu cầu sửa.',
      createdAt: existingSubmission.revisionSubmittedAt
    });
    task.lastActivityAt = existingSubmission.revisionSubmittedAt;
    task.submissionCount = db.submissions.filter(s => s.taskId === Number(taskId)).length;

    addActivityLog(db, {
      actorRole: req.user.role,
      actorId: req.user.id,
      eventType: 'ctv_agent_submission_resubmitted',
      entityType: 'submission',
      entityId: existingSubmission.id,
      message: `${collaborator?.name || 'CTV'} đã nộp lại báo cáo qua CTV Agent API cho nhiệm vụ #${task.id}`,
      metadata: { ctvId, taskId: task.id }
    });
    addNotification(db, {
      recipientRole: 'admin',
      type: 'ctv_agent_submission_resubmitted',
      title: 'CTV Agent nộp lại báo cáo',
      message: `${collaborator?.name || 'CTV'} đã nộp lại báo cáo nhiệm vụ #${task.id} qua Agent API`,
      entityType: 'submission',
      entityId: existingSubmission.id
    });

    writeDb(db);
    return agentResponse(res, { submission: existingSubmission }, 'CTV Agent đã nộp lại báo cáo thành công.', 200, [
      'Theo dõi kết quả review qua GET /api/ctv-agent/submissions hoặc notifications.'
    ]);
  }

  const newSubmission = {
    id: getNextId('submissions'),
    ctvId,
    taskId: Number(taskId),
    reward: task.reward,
    proofUrl,
    proofText: proofText || '',
    status: 'pending',
    rejectReason: '',
    revisionReason: '',
    revisionRequestedAt: null,
    revisionSubmittedAt: null,
    reviewHistory: [{
      action: 'agent_submitted',
      note: proofText || 'CTV Agent đã nộp báo cáo.',
      createdAt: new Date().toISOString()
    }],
    submittedAt: new Date().toISOString(),
    reviewedAt: null
  };

  db.submissions.unshift(newSubmission);
  task.lastActivityAt = newSubmission.submittedAt;
  task.submissionCount = db.submissions.filter(s => s.taskId === task.id).length;

  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'ctv_agent_submission_created',
    entityType: 'submission',
    entityId: newSubmission.id,
    message: `${collaborator?.name || 'CTV'} đã nộp báo cáo qua CTV Agent API cho nhiệm vụ #${task.id}`,
    metadata: { ctvId, taskId: task.id }
  });
  addNotification(db, {
    recipientRole: 'admin',
    type: 'ctv_agent_submission_created',
    title: 'CTV Agent nộp báo cáo mới',
    message: `${collaborator?.name || 'CTV'} đã nộp báo cáo nhiệm vụ #${task.id} qua Agent API`,
    entityType: 'submission',
    entityId: newSubmission.id
  });

  writeDb(db);
  agentResponse(res, { submission: newSubmission }, 'CTV Agent đã nộp báo cáo thành công.', 201, [
    'Theo dõi trạng thái pending/approved/revision_requested qua GET /api/ctv-agent/submissions.'
  ]);
});

router.get('/wallet', requireAgentScope('wallet:read'), (req, res) => {
  const db = readDb();
  const ctvId = req.user.ctvId;
  const collaborator = db.collaborators.find(c => c.id === ctvId);

  if (!collaborator) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ CTV.' });
  }

  agentResponse(res, {
    balance: collaborator.balance || 0,
    payouts: (db.payouts || []).filter(p => p.ctvId === ctvId),
    transactions: (db.transactions || []).filter(t => t.ctvId === ctvId)
  }, 'Dữ liệu ví của CTV hiện tại.');
});

router.get('/notifications', requireAgentScope('notifications:read'), (req, res) => {
  const db = readDb();
  agentResponse(res, { notifications: getVisibleNotifications(db, req.user.ctvId).slice(0, 100) }, 'Danh sách thông báo của CTV hiện tại.');
});

router.patch('/notifications/read-all', requireAgentScope('notifications:read'), (req, res) => {
  const db = readDb();
  const visibleIds = new Set(getVisibleNotifications(db, req.user.ctvId).map(n => n.id));
  const now = new Date().toISOString();
  let updated = 0;

  db.notifications = db.notifications || [];
  db.notifications.forEach(notification => {
    if (visibleIds.has(notification.id) && !notification.readAt) {
      notification.readAt = now;
      updated += 1;
    }
  });

  writeDb(db);
  agentResponse(res, { updated }, 'Đã đánh dấu tất cả thông báo là đã đọc.');
});

router.patch('/notifications/:id/read', requireAgentScope('notifications:read'), (req, res) => {
  const id = Number(req.params.id);
  const db = readDb();
  const visibleIds = new Set(getVisibleNotifications(db, req.user.ctvId).map(n => n.id));
  const notification = (db.notifications || []).find(n => n.id === id);

  if (!notification || !visibleIds.has(id)) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
  }

  notification.readAt = notification.readAt || new Date().toISOString();
  writeDb(db);
  agentResponse(res, { notification }, 'Đã đánh dấu thông báo là đã đọc.');
});

export default router;
