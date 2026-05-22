import express from 'express';
import { readDb, writeDb, getNextId, getLevelInfo, normalizeTaskLifecycle, addActivityLog, addNotification } from '../db.js';
import { verifyToken, requireAdmin, requireCtv } from '../middleware/auth.js';

const router = express.Router();

// Lấy danh sách nhiệm vụ (Cả Admin và CTV đều xem được)
router.get('/', (req, res) => {
  const db = readDb();
  res.json(db.tasks.map(task => normalizeTaskLifecycle(task, db.submissions || [])));
});

// Tạo nhiệm vụ mới (Admin only)
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { title, reward, platform, description, requirements, deadline, kpis, technicalRequirements, instructions, milestones, taskCode, githubRepo, githubBranch } = req.body;
  if (!title || !reward || !platform) {
    return res.status(400).json({ message: 'Vui lòng điền đủ Tên nhiệm vụ, mức thưởng và Nền tảng.' });
  }

  const db = readDb();
  const newTask = {
    id: getNextId('tasks'),
    assignedCtvId: null,
    title,
    reward: Number(reward),
    platform,
    description: description || '',
    requirements: requirements || '',
    deadline: deadline || '',
    status: 'active',
    createdAt: new Date().toISOString(),
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
    lastActivityAt: new Date().toISOString(),
    submissionCount: 0,
    taskCode: taskCode || `task-${getNextId('tasks')}`,
    githubRepo: githubRepo || '',
    githubBranch: githubBranch || '',
    kpis: Array.isArray(kpis) ? kpis : [],
    technicalRequirements: Array.isArray(technicalRequirements) ? technicalRequirements : [],
    instructions: Array.isArray(instructions) ? instructions : [],
    milestones: Array.isArray(milestones) ? milestones : []
  };

  db.tasks.unshift(newTask); // Thêm lên đầu danh sách
  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'task_created',
    entityType: 'task',
    entityId: newTask.id,
    message: `Admin tạo nhiệm vụ mới: ${newTask.title}`,
    metadata: { taskCode: newTask.taskCode }
  });
  writeDb(db);
  res.status(201).json(newTask);
});

// Cập nhật thông tin nhiệm vụ (Admin only)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { title, reward, platform, description, requirements, deadline, kpis, technicalRequirements, instructions, milestones, taskCode, githubRepo, githubBranch } = req.body;

  const db = readDb();
  const index = db.tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ cần sửa.' });
  }

  db.tasks[index] = {
    ...db.tasks[index],
    title: title || db.tasks[index].title,
    reward: reward !== undefined ? Number(reward) : db.tasks[index].reward,
    platform: platform || db.tasks[index].platform,
    description: description !== undefined ? description : db.tasks[index].description,
    requirements: requirements !== undefined ? requirements : db.tasks[index].requirements,
    deadline: deadline !== undefined ? deadline : db.tasks[index].deadline,
    kpis: Array.isArray(kpis) ? kpis : db.tasks[index].kpis,
    technicalRequirements: Array.isArray(technicalRequirements) ? technicalRequirements : db.tasks[index].technicalRequirements,
    instructions: Array.isArray(instructions) ? instructions : db.tasks[index].instructions,
    milestones: Array.isArray(milestones) ? milestones : db.tasks[index].milestones,
    taskCode: taskCode || db.tasks[index].taskCode || `task-${id}`,
    githubRepo: githubRepo !== undefined ? githubRepo : (db.tasks[index].githubRepo || ''),
    githubBranch: githubBranch !== undefined ? githubBranch : (db.tasks[index].githubBranch || ''),
    lastActivityAt: new Date().toISOString()
  };

  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'task_updated',
    entityType: 'task',
    entityId: id,
    message: `Admin cập nhật nhiệm vụ: ${db.tasks[index].title}`,
    metadata: { taskCode: db.tasks[index].taskCode }
  });
  writeDb(db);
  res.json(db.tasks[index]);
});

// Cập nhật trạng thái nhiệm vụ (Admin only)
router.patch('/:id/status', verifyToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body; // active, paused, completed

  if (!['active', 'paused', 'completed'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái nhiệm vụ không hợp lệ.' });
  }

  const db = readDb();
  const index = db.tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ.' });
  }

  db.tasks[index].status = status;
  db.tasks[index].lastActivityAt = new Date().toISOString();
  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'task_status_updated',
    entityType: 'task',
    entityId: id,
    message: `Admin chuyển nhiệm vụ #${id} sang trạng thái ${status}`,
    metadata: { status }
  });
  writeDb(db);
  res.json(db.tasks[index]);
});

// Nhận nhiệm vụ độc quyền (CTV only)
router.post('/:id/accept', verifyToken, requireCtv, (req, res) => {
  const id = Number(req.params.id);
  const ctvId = req.user.ctvId;

  if (!ctvId) {
    return res.status(400).json({ message: 'Tài khoản của bạn không liên kết với thông tin Cộng tác viên.' });
  }

  const db = readDb();
  const task = db.tasks.find(t => t.id === id);
  if (!task) {
    return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ.' });
  }

  if (task.status !== 'active') {
    return res.status(400).json({ message: 'Nhiệm vụ này không còn hoạt động để nhận.' });
  }

  if (task.assignedCtvId !== undefined && task.assignedCtvId !== null) {
    return res.status(400).json({ message: 'Nhiệm vụ này đã được nhận bởi một Cộng tác viên khác.' });
  }

  const collaborator = db.collaborators.find(c => c.id === ctvId);
  if (!collaborator) {
    return res.status(404).json({ message: 'Không tìm thấy thông tin Cộng tác viên.' });
  }

  const levelInfo = getLevelInfo(collaborator.exp);

  // Tính số lượng job đang active của CTV hiện tại
  const activeJobsCount = db.tasks.filter(t => t.assignedCtvId === ctvId && t.status === 'active').length;

  if (activeJobsCount >= levelInfo.maxJobs) {
    return res.status(400).json({ 
      message: `Bạn đã đạt giới hạn nhận việc tối đa của cấp độ hiện tại (Cấp ${levelInfo.level}: nhận tối đa ${levelInfo.maxJobs} việc). Hãy hoàn thành hoặc hủy công việc đang thực hiện trước khi nhận thêm.`
    });
  }

  // Gán task
  task.assignedCtvId = ctvId;
  task.acceptedAt = new Date().toISOString();
  task.cancelledAt = null;
  task.lastActivityAt = task.acceptedAt;
  task.taskCode = task.taskCode || `task-${task.id}`;
  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'task_accepted',
    entityType: 'task',
    entityId: task.id,
    message: `${collaborator.name} đã nhận nhiệm vụ: ${task.title}`,
    metadata: { ctvId, taskCode: task.taskCode }
  });
  addNotification(db, {
    recipientRole: 'admin',
    type: 'task_accepted',
    title: 'CTV nhận nhiệm vụ',
    message: `${collaborator.name} đã nhận nhiệm vụ #${task.id}`,
    entityType: 'task',
    entityId: task.id
  });
  writeDb(db);

  res.json({ message: 'Đã nhận nhiệm vụ thành công.', task });
});

// Hủy nhận nhiệm vụ (CTV only)
router.post('/:id/cancel', verifyToken, requireCtv, (req, res) => {
  const id = Number(req.params.id);
  const ctvId = req.user.ctvId;

  if (!ctvId) {
    return res.status(400).json({ message: 'Tài khoản của bạn không liên kết với thông tin Cộng tác viên.' });
  }

  const db = readDb();
  const task = db.tasks.find(t => t.id === id);
  if (!task) {
    return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ.' });
  }

  if (task.assignedCtvId !== ctvId) {
    return res.status(403).json({ message: 'Bạn không thể hủy nhiệm vụ của người khác.' });
  }

  // Kiểm tra xem đã có submission nào được duyệt chưa.
  const hasApprovedSubmission = db.submissions.some(s => s.taskId === id && s.ctvId === ctvId && s.status === 'approved');
  if (hasApprovedSubmission) {
    return res.status(400).json({ message: 'Nhiệm vụ này đã có bài nộp được duyệt, không thể hủy nhận.' });
  }

  // Giải phóng task
  const collaborator = db.collaborators.find(c => c.id === ctvId);
  task.assignedCtvId = null;
  task.cancelledAt = new Date().toISOString();
  task.lastActivityAt = task.cancelledAt;
  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'task_cancelled',
    entityType: 'task',
    entityId: task.id,
    message: `${collaborator?.name || 'CTV'} đã hủy nhận nhiệm vụ: ${task.title}`,
    metadata: { ctvId }
  });
  addNotification(db, {
    recipientRole: 'admin',
    type: 'task_cancelled',
    title: 'CTV hủy nhiệm vụ',
    message: `${collaborator?.name || 'CTV'} đã hủy nhiệm vụ #${task.id}`,
    entityType: 'task',
    entityId: task.id
  });
  writeDb(db);

  res.json({ message: 'Đã hủy nhận nhiệm vụ thành công.', task });
});

// Xóa nhiệm vụ (Admin only)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const db = readDb();

  const exists = db.tasks.some(t => t.id === id);
  if (!exists) {
    return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ.' });
  }

  db.tasks = db.tasks.filter(t => t.id !== id);
  // Cascading: Giữ nguyên lịch sử submissions nhưng chuyển link sang Task đã xóa
  writeDb(db);
  res.json({ message: 'Đã xóa nhiệm vụ thành công.' });
});

export default router;
