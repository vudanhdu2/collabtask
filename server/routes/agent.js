import express from 'express';
import { readDb, writeDb, getNextId, resetDb, getLevelInfo, addActivityLog, addNotification } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const AGENT_API_KEY = process.env.AGENT_API_KEY || 'collabtask-agent-super-secret-key-2026';

// Middleware to verify the Agent API Key
const verifyAgentKey = (req, res, next) => {
  const apiKeyHeader = req.headers['x-agent-api-key'];
  const queryApiKey = req.query.apiKey;
  const authHeader = req.headers['authorization'];
  
  let bearerToken = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7);
  }

  const providedKey = apiKeyHeader || queryApiKey || bearerToken;

  if (!providedKey || providedKey !== AGENT_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Mã bảo mật Agent API Key không chính xác hoặc không được cung cấp. Vui lòng gửi kèm x-agent-api-key trong Headers hoặc Bearer Token.'
    });
  }

  next();
};

// Apply security middleware to all agent endpoints
router.use(verifyAgentKey);

// 1. GET /status: Get overall system statistics
router.get('/status', (req, res) => {
  try {
    const db = readDb();
    res.json({
      success: true,
      counts: {
        users: db.users ? db.users.length : 0,
        collaborators: db.collaborators ? db.collaborators.length : 0,
        tasks: db.tasks ? db.tasks.length : 0,
        submissions: db.submissions ? db.submissions.length : 0,
        payouts: db.payouts ? db.payouts.length : 0,
        transactions: db.transactions ? db.transactions.length : 0,
        activityLogs: db.activityLogs ? db.activityLogs.length : 0,
        notifications: db.notifications ? db.notifications.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /db: Fetch entire raw database.json
router.get('/db', (req, res) => {
  try {
    const db = readDb();
    res.json({
      success: true,
      db
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /db: Overwrite database.json with a custom JSON payload
router.post('/db', (req, res) => {
  try {
    const newDb = req.body;
    if (!newDb || typeof newDb !== 'object') {
      return res.status(400).json({ success: false, message: 'Dữ liệu database không hợp lệ.' });
    }

    // Basic structure validation
    const requiredTables = ['users', 'collaborators', 'tasks', 'submissions', 'payouts', 'transactions'];
    for (const table of requiredTables) {
      if (!Array.isArray(newDb[table])) {
        return res.status(400).json({ success: false, message: `Bảng dữ liệu '${table}' bắt buộc phải là một Mảng (Array).` });
      }
    }

    writeDb(newDb);
    res.json({
      success: true,
      message: 'Đã cập nhật toàn bộ database thành công!',
      counts: {
        users: newDb.users.length,
        collaborators: newDb.collaborators.length,
        tasks: newDb.tasks.length,
        submissions: newDb.submissions.length,
        payouts: newDb.payouts.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. POST /tasks: Create a new task (programmatic control)
router.post('/tasks', (req, res) => {
  try {
    const { 
      title, 
      reward, 
      platform, 
      description, 
      requirements, 
      deadline, 
      kpis, 
      technicalRequirements, 
      instructions, 
      milestones 
    } = req.body;

    if (!title || !reward || !platform) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Tiêu đề (title), Thù lao (reward) và Nền tảng (platform).' });
    }

    const db = readDb();
    const newTask = {
      id: getNextId('tasks'),
      title,
      reward: Number(reward),
      platform,
      description: description || '',
      requirements: requirements || '',
      deadline: deadline || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      kpis: Array.isArray(kpis) ? kpis : [
        'Chất lượng code đạt tiêu chuẩn Clean Code (không dư thừa, định dạng chuẩn).',
        'Vượt qua tất cả các bài kiểm tra lỗi bảo mật cơ bản.',
        'Nộp bài đúng thời hạn deadline đã cam kết.',
        'Bằng chứng nghiệm thu (PR/Link) hoạt động chính xác, cấu trúc rõ ràng.'
      ],
      technicalRequirements: Array.isArray(technicalRequirements) ? technicalRequirements : [
        'Sử dụng các công nghệ tương ứng được liệt kê trong nền tảng.',
        'Đảm bảo mã nguồn hoạt động độc lập và không chứa các cấu hình cứng nhạy cảm.'
      ],
      instructions: Array.isArray(instructions) ? instructions : [
        'Bước 1: Fork repository chính hoặc clone trực tiếp về máy local của bạn.',
        'Bước 2: Tạo một branch mới từ main có tên theo cấu trúc: feature/task-[ID]-[tên].',
        'Bước 3: Phát triển tính năng hoặc sửa lỗi ở local và tự kiểm thử.',
        'Bước 4: Đẩy code và tạo Pull Request (PR) mô tả rõ những thay đổi đã thực hiện.',
        'Bước 5: Sao chép link PR nộp lên cổng thông tin CollabTask.'
      ],
      milestones: Array.isArray(milestones) ? milestones : [
        { title: 'Bắt đầu & Thiết kế', date: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0] },
        { title: 'Nộp bản Draft PR', date: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0] },
        { title: 'Hoàn thiện & Hạn chót', date: deadline || new Date(Date.now() + 10*24*60*60*1000).toISOString().split('T')[0] },
        { title: 'Nghiệm thu & Giải ngân', date: new Date(Date.now() + 12*24*60*60*1000).toISOString().split('T')[0] }
      ]
    };

    db.tasks.unshift(newTask);
    writeDb(db);

    res.status(201).json({
      success: true,
      message: 'Tạo nhiệm vụ mới thành công!',
      task: newTask
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. PUT /tasks/:id: Update an existing task
router.put('/tasks/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;

    const db = readDb();
    const index = db.tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: `Không tìm thấy nhiệm vụ với ID ${id}.` });
    }

    db.tasks[index] = {
      ...db.tasks[index],
      ...updates,
      id // Ensure ID remains immutable
    };

    // Parse values if passed in updates
    if (updates.reward !== undefined) db.tasks[index].reward = Number(updates.reward);

    writeDb(db);
    res.json({
      success: true,
      message: 'Cập nhật nhiệm vụ thành công!',
      task: db.tasks[index]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. DELETE /tasks/:id: Delete a task
router.delete('/tasks/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = readDb();

    const exists = db.tasks.some(t => t.id === id);
    if (!exists) {
      return res.status(404).json({ success: false, message: `Không tìm thấy nhiệm vụ với ID ${id}.` });
    }

    db.tasks = db.tasks.filter(t => t.id !== id);
    writeDb(db);

    res.json({
      success: true,
      message: `Đã xóa nhiệm vụ ID ${id} thành công.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. POST /submissions/:id/review: Approve or Reject collaborator task submissions
router.post('/submissions/:id/review', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action, rejectReason } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: "Hành động đánh giá không hợp lệ. Chỉ chấp nhận 'approve' hoặc 'reject'." });
    }

    const db = readDb();
    const subIndex = db.submissions.findIndex(s => s.id === id);
    if (subIndex === -1) {
      return res.status(404).json({ success: false, message: `Không tìm thấy báo cáo nộp với ID ${id}.` });
    }

    const sub = db.submissions[subIndex];
    if (sub.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Báo cáo nộp này đã được đánh giá từ trước.' });
    }

    const ctvIndex = db.collaborators.findIndex(c => c.id === sub.ctvId);
    if (ctvIndex === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cộng tác viên liên kết với báo cáo này.' });
    }

    if (action === 'approve') {
      const ctv = db.collaborators[ctvIndex];
      const levelInfo = getLevelInfo(ctv.exp || 0);
      const bonusAmount = Math.round(sub.reward * (levelInfo.bonusPercent / 100));
      const actualReward = sub.reward + bonusAmount;
      const reviewedAt = new Date().toISOString();

      ctv.balance += actualReward;
      ctv.exp = (ctv.exp || 0) + Math.round(sub.reward / 1000);
      ctv.level = getLevelInfo(ctv.exp).level;

      db.transactions = db.transactions || [];
      db.transactions.unshift({
        id: getNextId('transactions'),
        ctvId: sub.ctvId,
        type: 'earning',
        amount: actualReward,
        balanceAfter: ctv.balance,
        sourceType: 'submission',
        sourceId: sub.id,
        description: `Agent duyệt báo cáo nhiệm vụ #${sub.taskId}`,
        createdAt: reviewedAt
      });

      sub.status = 'approved';
      sub.reviewedAt = reviewedAt;
      sub.rejectReason = '';
      sub.reward = actualReward;
      sub.reviewHistory = sub.reviewHistory || [];
      sub.reviewHistory.push({
        action: 'approved',
        note: `Agent duyệt báo cáo, cộng ${actualReward.toLocaleString('vi-VN')}đ vào ví CTV.`,
        createdAt: reviewedAt
      });

      const task = db.tasks.find(t => t.id === sub.taskId);
      if (task) {
        task.status = 'completed';
        task.completedAt = reviewedAt;
        task.lastActivityAt = reviewedAt;
        task.submissionCount = db.submissions.filter(s => s.taskId === task.id).length;
      }

      addActivityLog(db, {
        eventType: 'agent_submission_approved',
        entityType: 'submission',
        entityId: sub.id,
        message: `Agent duyệt báo cáo nhiệm vụ #${sub.taskId}`,
        metadata: { ctvId: sub.ctvId, taskId: sub.taskId, reward: actualReward }
      });
      addNotification(db, {
        recipientRole: 'collaborator',
        recipientCtvId: sub.ctvId,
        type: 'submission_approved',
        title: 'Báo cáo đã được Agent duyệt',
        message: `Báo cáo nhiệm vụ #${sub.taskId} đã được duyệt và cộng ${actualReward.toLocaleString('vi-VN')}đ`,
        entityType: 'submission',
        entityId: sub.id
      });

      writeDb(db);
      res.json({
        success: true,
        message: 'Phê duyệt báo cáo và cộng tiền thưởng cho CTV thành công!',
        submission: sub,
        newBalance: ctv.balance,
        bonusAmount,
        actualReward
      });
    } else {
      if (!rejectReason) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối (rejectReason).' });
      }

      // Set submission as rejected
      db.submissions[subIndex].status = 'rejected';
      db.submissions[subIndex].rejectReason = rejectReason;
      db.submissions[subIndex].reviewedAt = new Date().toISOString();
      db.submissions[subIndex].reviewHistory = db.submissions[subIndex].reviewHistory || [];
      db.submissions[subIndex].reviewHistory.push({
        action: 'rejected',
        note: rejectReason,
        createdAt: db.submissions[subIndex].reviewedAt
      });
      addActivityLog(db, {
        eventType: 'agent_submission_rejected',
        entityType: 'submission',
        entityId: sub.id,
        message: `Agent từ chối báo cáo nhiệm vụ #${sub.taskId}`,
        metadata: { ctvId: sub.ctvId, taskId: sub.taskId, rejectReason }
      });
      addNotification(db, {
        recipientRole: 'collaborator',
        recipientCtvId: sub.ctvId,
        type: 'submission_rejected',
        title: 'Báo cáo bị Agent từ chối',
        message: `Báo cáo nhiệm vụ #${sub.taskId} bị từ chối: ${rejectReason}`,
        entityType: 'submission',
        entityId: sub.id
      });

      writeDb(db);
      res.json({
        success: true,
        message: 'Từ chối báo cáo nộp thành công!',
        submission: db.submissions[subIndex]
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. POST /payouts/:id/review: Approve or Reject collaborator payout/withdrawal requests
router.post('/payouts/:id/review', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { action, transactionId, rejectReason } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: "Hành động đánh giá không hợp lệ. Chỉ chấp nhận 'approve' hoặc 'reject'." });
    }

    const db = readDb();
    const payoutIndex = db.payouts.findIndex(p => p.id === id);
    if (payoutIndex === -1) {
      return res.status(404).json({ success: false, message: `Không tìm thấy yêu cầu rút tiền với ID ${id}.` });
    }

    const payout = db.payouts[payoutIndex];
    if (payout.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu rút tiền này đã được xử lý từ trước.' });
    }

    const ctvIndex = db.collaborators.findIndex(c => c.id === payout.ctvId);

    if (action === 'approve') {
      if (!transactionId) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã giao dịch (transactionId) chuyển khoản ngân hàng.' });
      }

      // Mark as paid
      db.payouts[payoutIndex].status = 'paid';
      db.payouts[payoutIndex].transactionId = transactionId;
      db.payouts[payoutIndex].resolvedAt = new Date().toISOString();
      db.transactions = db.transactions || [];
      db.transactions.unshift({
        id: getNextId('transactions'),
        ctvId: payout.ctvId,
        type: 'withdrawal_paid',
        amount: 0,
        balanceAfter: ctvIndex !== -1 ? db.collaborators[ctvIndex].balance : null,
        sourceType: 'payout',
        sourceId: payout.id,
        description: `Agent xác nhận chuyển khoản: ${transactionId}`,
        createdAt: db.payouts[payoutIndex].resolvedAt
      });
      addActivityLog(db, {
        eventType: 'agent_payout_paid',
        entityType: 'payout',
        entityId: payout.id,
        message: `Agent xác nhận thanh toán payout #${payout.id}`,
        metadata: { ctvId: payout.ctvId, transactionId }
      });
      addNotification(db, {
        recipientRole: 'collaborator',
        recipientCtvId: payout.ctvId,
        type: 'payout_paid',
        title: 'Yêu cầu rút tiền đã thanh toán',
        message: `Yêu cầu rút ${payout.amount.toLocaleString('vi-VN')}đ đã được thanh toán.`,
        entityType: 'payout',
        entityId: payout.id
      });

      writeDb(db);
      res.json({
        success: true,
        message: 'Đã phê duyệt yêu cầu chuyển tiền thành công!',
        payout: db.payouts[payoutIndex]
      });
    } else {
      if (!rejectReason) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối yêu cầu rút tiền (rejectReason).' });
      }

      // Return the funds to the collaborator's balance
      if (ctvIndex !== -1) {
        db.collaborators[ctvIndex].balance += payout.amount;
      }

      // Mark as rejected
      db.payouts[payoutIndex].status = 'rejected';
      db.payouts[payoutIndex].rejectReason = rejectReason;
      db.payouts[payoutIndex].resolvedAt = new Date().toISOString();
      db.transactions = db.transactions || [];
      db.transactions.unshift({
        id: getNextId('transactions'),
        ctvId: payout.ctvId,
        type: 'withdrawal_refund',
        amount: payout.amount,
        balanceAfter: ctvIndex !== -1 ? db.collaborators[ctvIndex].balance : null,
        sourceType: 'payout',
        sourceId: payout.id,
        description: `Agent hoàn tiền yêu cầu rút bị từ chối: ${rejectReason}`,
        createdAt: db.payouts[payoutIndex].resolvedAt
      });
      addActivityLog(db, {
        eventType: 'agent_payout_rejected',
        entityType: 'payout',
        entityId: payout.id,
        message: `Agent từ chối payout #${payout.id}`,
        metadata: { ctvId: payout.ctvId, rejectReason }
      });
      addNotification(db, {
        recipientRole: 'collaborator',
        recipientCtvId: payout.ctvId,
        type: 'payout_rejected',
        title: 'Yêu cầu rút tiền bị từ chối',
        message: `Yêu cầu rút ${payout.amount.toLocaleString('vi-VN')}đ bị từ chối: ${rejectReason}`,
        entityType: 'payout',
        entityId: payout.id
      });

      writeDb(db);
      res.json({
        success: true,
        message: 'Từ chối yêu cầu rút tiền và hoàn tiền vào ví CTV thành công!',
        payout: db.payouts[payoutIndex],
        newBalance: ctvIndex !== -1 ? db.collaborators[ctvIndex].balance : null
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. POST /seed: Reset the database to initial mock seed data
router.post('/seed', (req, res) => {
  try {
    const data = resetDb();
    res.json({
      success: true,
      message: 'Đã hoàn tác và reset database về trạng thái mặc định thành công!',
      counts: {
        users: data.users.length,
        collaborators: data.collaborators.length,
        tasks: data.tasks.length,
        submissions: data.submissions.length,
        payouts: data.payouts.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
