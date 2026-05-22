import express from 'express';
import { readDb, writeDb, getNextId, getLevelInfo, addActivityLog, addNotification } from '../db.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Lấy danh sách báo cáo (Cả Admin và CTV đều gọi được, lọc theo vai trò)
router.get('/', verifyToken, (req, res) => {
  const db = readDb();
  if (req.user.role === 'admin') {
    res.json(db.submissions);
  } else {
    // CTV chỉ xem được báo cáo của chính mình
    const mySubmissions = db.submissions.filter(s => s.ctvId === req.user.ctvId);
    res.json(mySubmissions);
  }
});

// CTV nộp báo cáo công việc mới
router.post('/', verifyToken, (req, res) => {
  const { taskId, proofUrl, proofText } = req.body;
  if (!taskId || !proofUrl) {
    return res.status(400).json({ message: 'Vui lòng cung cấp link bằng chứng hoàn thành nhiệm vụ.' });
  }

  const db = readDb();
  const task = db.tasks.find(t => t.id === Number(taskId));
  if (!task) {
    return res.status(404).json({ message: 'Không tìm thấy nhiệm vụ tương ứng.' });
  }
  const collaborator = db.collaborators.find(c => c.id === req.user.ctvId);

  if (task.status !== 'active') {
    return res.status(400).json({ message: 'Nhiệm vụ này đã tạm đóng hoặc kết thúc.' });
  }

  if (task.assignedCtvId !== req.user.ctvId) {
    return res.status(403).json({ message: 'Bạn không thể nộp báo cáo cho nhiệm vụ chưa nhận hoặc đã giao cho người khác.' });
  }

  const existingSubmission = db.submissions.find(s => (
    s.taskId === Number(taskId) &&
    s.ctvId === req.user.ctvId &&
    s.status === 'revision_requested'
  ));

  if (existingSubmission) {
    existingSubmission.proofUrl = proofUrl;
    existingSubmission.proofText = proofText || '';
    existingSubmission.status = 'pending';
    existingSubmission.revisionSubmittedAt = new Date().toISOString();
    existingSubmission.reviewHistory = existingSubmission.reviewHistory || [];
    existingSubmission.reviewHistory.push({
      action: 'resubmitted',
      note: proofText || 'CTV đã nộp lại báo cáo sau yêu cầu sửa.',
      createdAt: new Date().toISOString()
    });
    task.lastActivityAt = existingSubmission.revisionSubmittedAt;
    task.submissionCount = db.submissions.filter(s => s.taskId === Number(taskId)).length;
    addActivityLog(db, {
      actorRole: req.user.role,
      actorId: req.user.id,
      eventType: 'submission_resubmitted',
      entityType: 'submission',
      entityId: existingSubmission.id,
      message: `${collaborator?.name || 'CTV'} đã nộp lại báo cáo nhiệm vụ #${task.id}`,
      metadata: { ctvId: req.user.ctvId, taskId: task.id }
    });
    addNotification(db, {
      recipientRole: 'admin',
      type: 'submission_resubmitted',
      title: 'CTV đã nộp lại báo cáo',
      message: `${collaborator?.name || 'CTV'} đã nộp lại báo cáo nhiệm vụ #${task.id}`,
      entityType: 'submission',
      entityId: existingSubmission.id
    });
    writeDb(db);
    return res.json(existingSubmission);
  }

  const newSubmission = {
    id: getNextId('submissions'),
    ctvId: req.user.ctvId,
    taskId: Number(taskId),
    reward: task.reward,
    proofUrl,
    proofText: proofText || '',
    status: 'pending',
    rejectReason: '',
    revisionReason: '',
    revisionRequestedAt: null,
    revisionSubmittedAt: null,
    reviewHistory: [],
    submittedAt: new Date().toISOString(),
    reviewedAt: null
  };

  db.submissions.unshift(newSubmission);
  task.lastActivityAt = newSubmission.submittedAt;
  task.submissionCount = db.submissions.filter(s => s.taskId === task.id).length;
  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'submission_created',
    entityType: 'submission',
    entityId: newSubmission.id,
    message: `${collaborator?.name || 'CTV'} đã nộp báo cáo nhiệm vụ #${task.id}`,
    metadata: { ctvId: req.user.ctvId, taskId: task.id }
  });
  addNotification(db, {
    recipientRole: 'admin',
    type: 'submission_created',
    title: 'Báo cáo mới chờ duyệt',
    message: `${collaborator?.name || 'CTV'} đã nộp báo cáo nhiệm vụ #${task.id}`,
    entityType: 'submission',
    entityId: newSubmission.id
  });
  writeDb(db);
  res.status(201).json(newSubmission);
});

// Admin Duyệt báo cáo (Cộng tiền vào ví CTV)
router.patch('/:id/approve', verifyToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const db = readDb();

  const submissionIndex = db.submissions.findIndex(s => s.id === id);
  if (submissionIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy báo cáo nộp.' });
  }

  const sub = db.submissions[submissionIndex];
  if (sub.status !== 'pending') {
    return res.status(400).json({ message: 'Báo cáo này đã được duyệt hoặc từ chối trước đó.' });
  }

  // Cộng tiền vào ví CTV tương ứng
  const ctvIndex = db.collaborators.findIndex(c => c.id === sub.ctvId);
  if (ctvIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy CTV liên quan để cộng tiền.' });
  }

  const ctv = db.collaborators[ctvIndex];
  
  // Áp dụng hệ thống thưởng % cấp độ
  const levelInfo = getLevelInfo(ctv.exp || 0);
  const bonusAmount = Math.round(sub.reward * (levelInfo.bonusPercent / 100));
  const actualReward = sub.reward + bonusAmount;

  // Thực hiện cộng tiền
  ctv.balance += actualReward;
  db.transactions = db.transactions || [];
  db.transactions.unshift({
    id: getNextId('transactions'),
    ctvId: sub.ctvId,
    type: 'earning',
    amount: actualReward,
    balanceAfter: ctv.balance,
    sourceType: 'submission',
    sourceId: sub.id,
    description: `Duyệt báo cáo nhiệm vụ #${sub.taskId}`,
    createdAt: new Date().toISOString()
  });
  
  // Cộng EXP và thăng cấp
  const expEarned = Math.round(sub.reward / 1000);
  ctv.exp = (ctv.exp || 0) + expEarned;
  
  const newLevelInfo = getLevelInfo(ctv.exp);
  ctv.level = newLevelInfo.level;

  // Cập nhật trạng thái báo cáo
  sub.status = 'approved';
  sub.reviewedAt = new Date().toISOString();
  sub.reviewHistory = sub.reviewHistory || [];
  sub.reviewHistory.push({
    action: 'approved',
    note: `Duyệt báo cáo, cộng ${actualReward.toLocaleString('vi-VN')}đ vào ví CTV.`,
    createdAt: sub.reviewedAt
  });
  
  // Lưu thù lao thực lĩnh vào submission
  sub.reward = actualReward;

  // Chuyển nhiệm vụ tương ứng thành hoàn thành
  const task = db.tasks.find(t => t.id === sub.taskId);
  if (task) {
    task.status = 'completed';
    task.completedAt = sub.reviewedAt;
    task.lastActivityAt = sub.reviewedAt;
    task.submissionCount = db.submissions.filter(s => s.taskId === task.id).length;
  }

  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'submission_approved',
    entityType: 'submission',
    entityId: sub.id,
    message: `Admin duyệt báo cáo nhiệm vụ #${sub.taskId}`,
    metadata: { ctvId: sub.ctvId, taskId: sub.taskId, reward: actualReward }
  });
  addNotification(db, {
    recipientRole: 'collaborator',
    recipientCtvId: sub.ctvId,
    type: 'submission_approved',
    title: 'Báo cáo đã được duyệt',
    message: `Báo cáo nhiệm vụ #${sub.taskId} đã được duyệt và cộng ${actualReward.toLocaleString('vi-VN')}đ`,
    entityType: 'submission',
    entityId: sub.id
  });

  writeDb(db);
  res.json({
    submission: sub,
    ctv: ctv,
    bonusPercent: levelInfo.bonusPercent,
    bonusAmount: bonusAmount,
    expEarned: expEarned
  });
});

// Admin Từ chối báo cáo (Nêu lý do)
router.patch('/:id/reject', verifyToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { rejectReason } = req.body;

  if (!rejectReason) {
    return res.status(400).json({ message: 'Vui lòng cung cấp lý do từ chối.' });
  }

  const db = readDb();
  const submissionIndex = db.submissions.findIndex(s => s.id === id);
  if (submissionIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy báo cáo.' });
  }

  const sub = db.submissions[submissionIndex];
  if (sub.status !== 'pending') {
    return res.status(400).json({ message: 'Báo cáo này đã được xử lý trước đó.' });
  }

  // Cập nhật trạng thái từ chối
  db.submissions[submissionIndex].status = 'rejected';
  db.submissions[submissionIndex].rejectReason = rejectReason;
  db.submissions[submissionIndex].reviewedAt = new Date().toISOString();
  db.submissions[submissionIndex].reviewHistory = db.submissions[submissionIndex].reviewHistory || [];
  db.submissions[submissionIndex].reviewHistory.push({
    action: 'rejected',
    note: rejectReason,
    createdAt: db.submissions[submissionIndex].reviewedAt
  });

  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'submission_rejected',
    entityType: 'submission',
    entityId: sub.id,
    message: `Admin từ chối báo cáo nhiệm vụ #${sub.taskId}`,
    metadata: { ctvId: sub.ctvId, taskId: sub.taskId, rejectReason }
  });
  addNotification(db, {
    recipientRole: 'collaborator',
    recipientCtvId: sub.ctvId,
    type: 'submission_rejected',
    title: 'Báo cáo bị từ chối',
    message: `Báo cáo nhiệm vụ #${sub.taskId} bị từ chối: ${rejectReason}`,
    entityType: 'submission',
    entityId: sub.id
  });

  writeDb(db);
  res.json(db.submissions[submissionIndex]);
});

// Admin yêu cầu CTV sửa lại báo cáo
router.patch('/:id/request-revision', verifyToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { revisionReason } = req.body;

  if (!revisionReason) {
    return res.status(400).json({ message: 'Vui lòng cung cấp nội dung cần chỉnh sửa.' });
  }

  const db = readDb();
  const submissionIndex = db.submissions.findIndex(s => s.id === id);
  if (submissionIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy báo cáo.' });
  }

  const sub = db.submissions[submissionIndex];
  if (sub.status !== 'pending') {
    return res.status(400).json({ message: 'Chỉ có thể yêu cầu sửa báo cáo đang chờ duyệt.' });
  }

  sub.status = 'revision_requested';
  sub.revisionReason = revisionReason;
  sub.revisionRequestedAt = new Date().toISOString();
  sub.reviewedAt = sub.revisionRequestedAt;
  sub.reviewHistory = sub.reviewHistory || [];
  sub.reviewHistory.push({
    action: 'revision_requested',
    note: revisionReason,
    createdAt: sub.revisionRequestedAt
  });

  addActivityLog(db, {
    actorRole: req.user.role,
    actorId: req.user.id,
    eventType: 'submission_revision_requested',
    entityType: 'submission',
    entityId: sub.id,
    message: `Admin yêu cầu sửa báo cáo nhiệm vụ #${sub.taskId}`,
    metadata: { ctvId: sub.ctvId, taskId: sub.taskId, revisionReason }
  });
  addNotification(db, {
    recipientRole: 'collaborator',
    recipientCtvId: sub.ctvId,
    type: 'submission_revision_requested',
    title: 'Báo cáo cần chỉnh sửa',
    message: `Admin yêu cầu sửa báo cáo nhiệm vụ #${sub.taskId}: ${revisionReason}`,
    entityType: 'submission',
    entityId: sub.id
  });

  writeDb(db);
  res.json(sub);
});

export default router;
