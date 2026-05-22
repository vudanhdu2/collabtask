import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { readDb, writeDb, getNextId } from '../db.js';

dotenv.config();
const router = express.Router();
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'webhook-secret-collabtask';

// Middleware xác thực chữ ký GitHub Webhook (X-Hub-Signature-256)
const verifyGitHubSignature = (req, res, buf, encoding) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    throw new Error('Không có chữ ký GitHub Webhook.');
  }

  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(buf)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Chữ ký GitHub Webhook không hợp lệ.');
  }
};

// Lưu trữ các sự kiện Webhook đã nhận để phục vụ trang console log
export const webhookLogs = [];

// Endpoint nhận Webhook Event từ GitHub
router.post('/', (req, res) => {
  const event = req.headers['x-github-event'];
  const body = req.body;

  // Ghi log sự kiện nhận được
  const logEntry = {
    id: Date.now(),
    event,
    action: body.action || 'push',
    sender: body.sender?.login || 'unknown',
    repository: body.repository?.full_name || 'unknown',
    timestamp: new Date().toISOString(),
    details: ''
  };

  const db = readDb();

  if (event === 'push') {
    const commitsCount = body.commits?.length || 0;
    const ref = body.ref || '';
    logEntry.details = `Pushed ${commitsCount} commits to branch ${ref.replace('refs/heads/', '')}`;

    // Tìm CTV có GitHub username khớp với người push commit
    const gitUser = body.sender?.login;
    const mappedCtv = db.collaborators.find(c => c.githubUsername === gitUser);
    
    if (mappedCtv && commitsCount > 0) {
      logEntry.details += ` · Mapped to CTV: ${mappedCtv.name} (ID: ${mappedCtv.id})`;
    }
  } 
  else if (event === 'pull_request') {
    const prNumber = body.number;
    const prTitle = body.pull_request?.title;
    const prState = body.pull_request?.merged ? 'merged' : body.action;
    logEntry.details = `PR #${prNumber} "${prTitle}": State changed to ${prState}`;

    // Tự động tạo submission cho CTV khi có Pull Request được mở
    const gitUser = body.pull_request?.user?.login;
    const mappedCtv = db.collaborators.find(c => c.githubUsername === gitUser);

    if (mappedCtv) {
      logEntry.details += ` · Mapped to CTV: ${mappedCtv.name}`;

      if (body.action === 'opened') {
        // Tìm xem nhiệm vụ liên quan nhất là gì, hoặc auto-assign cho nhiệm vụ active đầu tiên có nhãn Github
        const githubTask = db.tasks.find(t => t.platform === 'GitHub' && t.status === 'active');
        
        if (githubTask) {
          const newSub = {
            id: getNextId('submissions'),
            ctvId: mappedCtv.id,
            taskId: githubTask.id,
            reward: githubTask.reward,
            proofUrl: body.pull_request.html_url,
            proofText: `[Auto-created via GitHub Webhook] Pull Request #${prNumber}: ${prTitle}`,
            status: 'pending',
            rejectReason: '',
            submittedAt: new Date().toISOString(),
            reviewedAt: null
          };

          db.submissions.unshift(newSub);
          writeDb(db);
          logEntry.details += ` · Tự động tạo Báo cáo công việc thành công cho Task #${githubTask.id}`;
        }
      }
    }
  } else {
    logEntry.details = `Event "${event}" received. Action: ${body.action || 'none'}`;
  }

  // Giới hạn tối đa 50 log events trong RAM console
  webhookLogs.unshift(logEntry);
  if (webhookLogs.length > 50) webhookLogs.pop();

  res.json({ message: 'Nhận sự kiện Webhook thành công.', logged: true });
});

// Endpoint phụ lấy danh sách logs hiển thị trên UI Webhook Console
router.get('/logs', (req, res) => {
  res.json(webhookLogs);
});

export default router;
