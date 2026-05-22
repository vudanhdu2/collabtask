import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { readDb } from '../db.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'collabtask-secret-key-2026-production';

// Xác thực JWT token
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Không tìm thấy mã xác thực token.' });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ message: 'Định dạng mã token không hợp lệ.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    
    // Kiểm tra tính hợp lệ của user trong DB
    const db = readDb();
    const userExists = db.users.find(u => u.id === decoded.id);
    if (!userExists) {
      return res.status(403).json({ message: 'Tài khoản không tồn tại trên hệ thống.' });
    }
    
    next();
  } catch {
    return res.status(403).json({ message: 'Mã token hết hạn hoặc không hợp lệ.' });
  }
};

// Yêu cầu quyền Admin
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.' });
  }
};

// Yêu cầu quyền CTV
export const requireCtv = (req, res, next) => {
  if (req.user && req.user.role === 'collaborator') {
    next();
  } else {
    return res.status(403).json({ message: 'Quyền truy cập bị từ chối. Chỉ dành cho Cộng tác viên.' });
  }
};
