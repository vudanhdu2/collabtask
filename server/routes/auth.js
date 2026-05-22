import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { readDb, writeDb, getNextId } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'collabtask-secret-key-2026-production';

// Đăng nhập
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.' });
  }

  const db = readDb();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
  }

  try {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    // Đính kèm thêm thông tin CTV nếu có
    let ctvDetails = null;
    if (user.ctvId) {
      ctvDetails = db.collaborators.find(c => c.id === user.ctvId) || null;
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      ctvId: user.ctvId
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        ctvDetails
      }
    });
  } catch (err) {
    console.error('Lỗi login:', err);
    res.status(500).json({ message: 'Lỗi hệ thống trong quá trình đăng nhập.' });
  }
});

// Đăng ký tài khoản CTV mới
router.post('/register', async (req, res) => {
  const { username, password, name, phone, email, githubUsername } = req.body;
  if (!username || !password || !name || !phone || !email) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin đăng ký bắt buộc.' });
  }

  const db = readDb();
  const usernameTaken = db.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (usernameTaken) {
    return res.status(400).json({ message: 'Tên đăng nhập này đã có người sử dụng.' });
  }

  const emailTaken = db.collaborators.some(c => c.email.toLowerCase() === email.toLowerCase());
  if (emailTaken) {
    return res.status(400).json({ message: 'Địa chỉ Email này đã được đăng ký.' });
  }

  const phoneTaken = db.collaborators.some(c => c.phone === phone);
  if (phoneTaken) {
    return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const newCtvId = getNextId('collaborators');
    
    // 1. Tạo CTV mới ở trạng thái "Chờ duyệt"
    const newCtv = {
      id: newCtvId,
      name,
      phone,
      email,
      balance: 0,
      status: 'pending', // Chờ phê duyệt của Admin
      githubUsername: githubUsername || '',
      joinedAt: new Date().toISOString()
    };
    db.collaborators.push(newCtv);

    // 2. Tạo Tài khoản User
    const newUser = {
      id: getNextId('users'),
      username,
      passwordHash,
      role: 'collaborator',
      ctvId: newCtvId,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);

    writeDb(db);

    res.status(201).json({
      message: 'Đăng ký tài khoản Cộng tác viên thành công! Vui lòng chờ Admin phê duyệt để hoạt động.'
    });
  } catch (err) {
    console.error('Lỗi register:', err);
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng ký tài khoản.' });
  }
});

// Lấy thông tin user hiện tại
router.get('/me', verifyToken, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User không tồn tại.' });
  }

  let ctvDetails = null;
  if (user.ctvId) {
    ctvDetails = db.collaborators.find(c => c.id === user.ctvId) || null;
  }

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    ctvDetails
  });
});

export default router;
