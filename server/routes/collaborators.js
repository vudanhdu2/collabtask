import express from 'express';
import { readDb, writeDb, getNextId } from '../db.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Lấy danh sách CTV (Admin xem toàn bộ)
router.get('/', verifyToken, requireAdmin, (req, res) => {
  const db = readDb();
  res.json(db.collaborators);
});

// Admin thêm CTV thủ công
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { name, phone, email, balance, githubUsername, status } = req.body;
  if (!name || !phone || !email) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ Tên, SĐT và Email.' });
  }

  const db = readDb();
  const phoneExists = db.collaborators.some(c => c.phone === phone);
  if (phoneExists) {
    return res.status(400).json({ message: 'Số điện thoại này đã được đăng ký.' });
  }

  const emailExists = db.collaborators.some(c => c.email.toLowerCase() === email.toLowerCase());
  if (emailExists) {
    return res.status(400).json({ message: 'Địa chỉ Email này đã được đăng ký.' });
  }

  const newCtv = {
    id: getNextId('collaborators'),
    name,
    phone,
    email,
    balance: Number(balance) || 0,
    status: status || 'active',
    githubUsername: githubUsername || '',
    joinedAt: new Date().toISOString()
  };

  db.collaborators.push(newCtv);
  writeDb(db);
  res.status(201).json(newCtv);
});

// Cập nhật trạng thái CTV (Active / Pending / Suspended)
router.patch('/:id/status', verifyToken, requireAdmin, (req, res) => {
  const { status } = req.body;
  const id = Number(req.params.id);

  if (!['active', 'pending', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái CTV không hợp lệ.' });
  }

  const db = readDb();
  const index = db.collaborators.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Không tìm thấy Cộng tác viên.' });
  }

  db.collaborators[index].status = status;
  writeDb(db);
  res.json(db.collaborators[index]);
});

// Xóa CTV khỏi hệ thống
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const db = readDb();

  const exists = db.collaborators.some(c => c.id === id);
  if (!exists) {
    return res.status(404).json({ message: 'Không tìm thấy Cộng tác viên.' });
  }

  db.collaborators = db.collaborators.filter(c => c.id !== id);
  // Đồng thời xóa tài khoản user liên quan nếu có
  db.users = db.users.filter(u => u.ctvId !== id);

  writeDb(db);
  res.json({ message: 'Đã xóa Cộng tác viên thành công.' });
});

// Lấy bảng xếp hạng CTV theo EXP giảm dần (Cả Admin và CTV đều xem được)
router.get('/leaderboard', verifyToken, (req, res) => {
  const db = readDb();
  
  // Chỉ hiển thị CTV active
  const activeCollaborators = db.collaborators.filter(c => c.status === 'active');
  
  // Tính số lượng job đã hoàn thành cho từng CTV
  const leaderboardData = activeCollaborators.map(c => {
    const completedTasksCount = db.submissions.filter(s => s.ctvId === c.id && s.status === 'approved').length;
    return {
      id: c.id,
      name: c.name,
      githubUsername: c.githubUsername,
      exp: c.exp || 0,
      level: c.level || 1,
      completedTasksCount
    };
  });
  
  // Sắp xếp theo EXP giảm dần, nếu bằng nhau thì xếp theo số job đã hoàn thành
  leaderboardData.sort((a, b) => {
    if (b.exp !== a.exp) {
      return b.exp - a.exp;
    }
    return b.completedTasksCount - a.completedTasksCount;
  });
  
  res.json(leaderboardData);
});

export default router;
