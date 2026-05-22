import express from 'express';
import { readDb, writeDb, getNextId, getLevelInfo } from '../db.js';
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

  if (task.status !== 'active') {
    return res.status(400).json({ message: 'Nhiệm vụ này đã tạm đóng hoặc kết thúc.' });
  }

  if (task.assignedCtvId !== req.user.ctvId) {
    return res.status(403).json({ message: 'Bạn không thể nộp báo cáo cho nhiệm vụ chưa nhận hoặc đã giao cho người khác.' });
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
    submittedAt: new Date().toISOString(),
    reviewedAt: null
  };

  db.submissions.unshift(newSubmission);
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
  
  // Cộng EXP và thăng cấp
  const expEarned = Math.round(sub.reward / 1000);
  ctv.exp = (ctv.exp || 0) + expEarned;
  
  const newLevelInfo = getLevelInfo(ctv.exp);
  ctv.level = newLevelInfo.level;

  // Cập nhật trạng thái báo cáo
  sub.status = 'approved';
  sub.reviewedAt = new Date().toISOString();
  
  // Lưu thù lao thực lĩnh vào submission
  sub.reward = actualReward;

  // Chuyển nhiệm vụ tương ứng thành hoàn thành
  const task = db.tasks.find(t => t.id === sub.taskId);
  if (task) {
    task.status = 'completed';
  }

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

  writeDb(db);
  res.json(db.submissions[submissionIndex]);
});

export default router;
