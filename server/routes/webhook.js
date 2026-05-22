import express from 'express';
import { readDb, writeDb, getNextId, addActivityLog, addNotification } from '../db.js';

const router = express.Router();

// Lưu trữ các sự kiện Webhook đã nhận để phục vụ trang console log
export const webhookLogs = [];

const getPrText = (body) => {
  const pr = body.pull_request || {};
  return [
    pr.title,
    pr.body,
    pr.head?.ref,
    pr.head?.label,
    body.ref
  ].filter(Boolean).join(' ').toLowerCase();
};

const findTaskForPullRequest = (db, body, mappedCtv) => {
  const prText = getPrText(body);
  const taskByCode = db.tasks.find(task => {
    const code = (task.taskCode || `task-${task.id}`).toLowerCase();
    return prText.includes(code);
  });
  if (taskByCode) return { task: taskByCode, reason: 'taskCode' };

  if (mappedCtv) {
    const activeTasks = db.tasks.filter(task => (
      task.status === 'active' && task.assignedCtvId === mappedCtv.id
    ));
    if (activeTasks.length === 1) return { task: activeTasks[0], reason: 'assignedCtv' };
  }

  return { task: null, reason: 'unmatched' };
};

const createSubmissionPayload = (db, mappedCtv, task, body) => {
  const pr = body.pull_request || {};
  const now = new Date().toISOString();
  return {
    id: getNextId('submissions'),
    ctvId: mappedCtv.id,
    taskId: task.id,
    reward: task.reward,
    proofUrl: pr.html_url,
    proofText: `[Auto-created via GitHub Webhook] Pull Request #${body.number}: ${pr.title}`,
    status: 'pending',
    rejectReason: '',
    revisionReason: '',
    revisionRequestedAt: null,
    revisionSubmittedAt: null,
    reviewHistory: [{
      action: 'webhook_created',
      note: `Tự động tạo từ PR #${body.number}`,
      createdAt: now
    }],
    submittedAt: now,
    reviewedAt: null
  };
};

// Endpoint nhận Webhook Event từ GitHub
router.post('/', (req, res) => {
  const event = req.headers['x-github-event'];
  const body = req.body;

  // Ghi log sự kiện nhận được
  const logEntry = {
    id: Date.now(),
    event,
    action: body.action || 'push',
    sender: body.sender?.login || body.pull_request?.user?.login || 'unknown',
    repository: body.repository?.full_name || 'unknown',
    timestamp: new Date().toISOString(),
    details: '',
    ctvId: null,
    taskId: null,
    submissionId: null,
    url: body.pull_request?.html_url || '',
    status: 'received'
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
      logEntry.ctvId = mappedCtv.id;
      logEntry.status = 'mapped';
      logEntry.details += ` · Mapped to CTV: ${mappedCtv.name} (ID: ${mappedCtv.id})`;
      addActivityLog(db, {
        eventType: 'github_push_mapped',
        entityType: 'collaborator',
        entityId: mappedCtv.id,
        message: `GitHub push từ ${mappedCtv.name}: ${commitsCount} commit`,
        metadata: { branch: ref.replace('refs/heads/', ''), commitsCount }
      });
    }
  }
  else if (event === 'pull_request') {
    const prNumber = body.number;
    const prTitle = body.pull_request?.title || '';
    const prState = body.pull_request?.merged ? 'merged' : body.action;
    logEntry.details = `PR #${prNumber} "${prTitle}": State changed to ${prState}`;

    const gitUser = body.pull_request?.user?.login;
    const mappedCtv = db.collaborators.find(c => c.githubUsername === gitUser);

    if (!mappedCtv) {
      logEntry.status = 'unmapped';
      logEntry.details += ' · Cần map thủ công: không tìm thấy CTV theo GitHub username';
      addActivityLog(db, {
        eventType: 'github_pr_unmapped',
        entityType: 'webhook',
        entityId: logEntry.id,
        message: `PR #${prNumber} chưa map được CTV GitHub @${gitUser || 'unknown'}`,
        metadata: { prNumber, gitUser }
      });
      addNotification(db, {
        recipientRole: 'admin',
        type: 'github_pr_unmapped',
        title: 'GitHub PR cần map thủ công',
        message: `PR #${prNumber} chưa khớp CTV GitHub @${gitUser || 'unknown'}`,
        entityType: 'webhook',
        entityId: logEntry.id
      });
    } else {
      logEntry.ctvId = mappedCtv.id;
      const { task, reason } = findTaskForPullRequest(db, body, mappedCtv);
      logEntry.details += ` · Mapped to CTV: ${mappedCtv.name}`;

      if (!task) {
        logEntry.status = 'unmatched_task';
        logEntry.details += ' · Cần map thủ công: không tìm thấy task phù hợp';
        addActivityLog(db, {
          eventType: 'github_pr_unmatched_task',
          entityType: 'collaborator',
          entityId: mappedCtv.id,
          message: `PR #${prNumber} của ${mappedCtv.name} chưa khớp nhiệm vụ`,
          metadata: { prNumber, gitUser }
        });
        addNotification(db, {
          recipientRole: 'admin',
          type: 'github_pr_unmatched_task',
          title: 'GitHub PR cần map task',
          message: `PR #${prNumber} của ${mappedCtv.name} chưa khớp nhiệm vụ`,
          entityType: 'webhook',
          entityId: logEntry.id
        });
      } else if (['opened', 'synchronize', 'reopened'].includes(body.action)) {
        logEntry.taskId = task.id;
        logEntry.status = 'mapped';
        const existingSubmission = db.submissions.find(s => s.proofUrl === body.pull_request?.html_url || (
          s.taskId === task.id && s.ctvId === mappedCtv.id && ['pending', 'revision_requested'].includes(s.status)
        ));

        if (existingSubmission) {
          existingSubmission.proofUrl = body.pull_request?.html_url;
          existingSubmission.proofText = `[Auto-updated via GitHub Webhook] Pull Request #${prNumber}: ${prTitle}`;
          existingSubmission.status = 'pending';
          existingSubmission.revisionSubmittedAt = new Date().toISOString();
          existingSubmission.reviewHistory = existingSubmission.reviewHistory || [];
          existingSubmission.reviewHistory.push({
            action: 'webhook_updated',
            note: `Webhook cập nhật từ PR #${prNumber}`,
            createdAt: new Date().toISOString()
          });
          logEntry.submissionId = existingSubmission.id;
          logEntry.details += ` · Cập nhật submission #${existingSubmission.id} cho Task #${task.id} (${reason})`;
        } else {
          const newSub = createSubmissionPayload(db, mappedCtv, task, body);
          db.submissions.unshift(newSub);
          logEntry.submissionId = newSub.id;
          logEntry.details += ` · Tự động tạo submission #${newSub.id} cho Task #${task.id} (${reason})`;
        }

        task.assignedCtvId = task.assignedCtvId || mappedCtv.id;
        task.lastActivityAt = new Date().toISOString();
        task.submissionCount = db.submissions.filter(s => s.taskId === task.id).length;
        addActivityLog(db, {
          eventType: 'github_pr_mapped',
          entityType: 'task',
          entityId: task.id,
          message: `GitHub PR #${prNumber} đã map vào nhiệm vụ #${task.id}`,
          metadata: { prNumber, ctvId: mappedCtv.id, submissionId: logEntry.submissionId, reason }
        });
        addNotification(db, {
          recipientRole: 'admin',
          type: 'submission_created',
          title: 'Webhook tạo/cập nhật báo cáo',
          message: `PR #${prNumber} đã tạo/cập nhật báo cáo cho task #${task.id}`,
          entityType: 'submission',
          entityId: logEntry.submissionId
        });
      }
    }
  } else {
    logEntry.details = `Event "${event}" received. Action: ${body.action || 'none'}`;
  }

  // Giới hạn tối đa 50 log events trong RAM console
  webhookLogs.unshift(logEntry);
  if (webhookLogs.length > 50) webhookLogs.pop();
  writeDb(db);

  res.json({ message: 'Nhận sự kiện Webhook thành công.', logged: true, log: logEntry });
});

// Endpoint phụ lấy danh sách logs hiển thị trên UI Webhook Console
router.get('/logs', (req, res) => {
  res.json(webhookLogs);
});

export default router;
