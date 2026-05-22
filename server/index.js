import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import local modules
import { readDb } from './db.js';
import authRoutes from './routes/auth.js';
import collaboratorRoutes from './routes/collaborators.js';
import taskRoutes from './routes/tasks.js';
import submissionRoutes from './routes/submissions.js';
import payoutRoutes from './routes/payouts.js';
import webhookRoutes from './routes/webhook.js';
import agentRoutes from './routes/agent.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS setup
app.use(cors());

// Parse JSON payloads (Webhook payload cần raw body nếu verify signature, ở đây ta parse JSON đơn giản trước)
app.use(express.json());

// Tự động khởi chạy & xác nhận DB đã được thiết lập
const db = readDb();
console.log(`[Database] Đã tải thành công ${db.collaborators.length} CTVs, ${db.tasks.length} nhiệm vụ.`);

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/collaborators', collaboratorRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/webhook/github', webhookRoutes);
app.use('/api/agent', agentRoutes);

// API Download tài liệu hướng dẫn / điều khoản bảo mật bảo mật chống Directory Traversal
app.get('/api/docs/download/:filename', (req, res) => {
  const { filename } = req.params;
  
  // Chỉ cho phép tải file có tên an toàn là chữ cái/số/gạch dưới/gạch ngang và đuôi .md
  const safeFilenameRegex = /^[a-zA-Z0-9_-]+\.md$/;
  if (!safeFilenameRegex.test(filename)) {
    return res.status(400).json({ message: 'Tên tệp tin không hợp lệ.' });
  }

  const filePath = path.join(__dirname, '../docs', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Tài liệu không tồn tại.' });
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Lỗi khi tải file:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Lỗi máy chủ khi tải tài liệu.' });
      }
    }
  });
});

// Phục vụ giao diện Frontend tĩnh trong môi trường Production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Ở môi trường development
  app.get('/', (req, res) => {
    res.send('Backend API Server CollabTask đang hoạt động ổn định trên Port ' + PORT);
  });
}
// Khởi chạy server với cơ chế tự động thử lại khi trùng cổng (EADDRINUSE) trên Windows
const startServer = (port, retries = 5, delay = 1000) => {
  const server = app.listen(port, () => {
    console.log(`===========================================================`);
    console.log(`🚀 Server CollabTask hoạt động tại: http://localhost:${port}`);
    console.log(`🔗 Webhook endpoint: http://localhost:${port}/api/webhook/github`);
    console.log(`===========================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (retries > 0) {
        console.warn(`[Server] Cổng ${port} đang bị chiếm dụng. Đang thử lại sau ${delay}ms... (Còn lại ${retries} lần thử)`);
        setTimeout(() => {
          try {
            server.close();
          } catch (closeErr) {
            // Đã đóng hoặc không thể đóng
          }
          startServer(port, retries - 1, delay);
        }, delay);
      } else {
        console.error(`[Server] Không thể khởi chạy server. Cổng ${port} đã bị chiếm dụng hoàn toàn.`);
        process.exit(1);
      }
    } else {
      console.error('[Server] Lỗi không xác định:', err);
    }
  });
};

startServer(PORT);
