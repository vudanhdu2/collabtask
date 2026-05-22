import express from 'express';
import { readDb, writeDb, getNextId } from '../db.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Lấy danh sách yêu cầu rút tiền
router.get('/', verifyToken, (req, res) => {
  const db = readDb();
  if (req.user.role === 'admin') {
    res.json(db.payouts);
  } else {
    // CTV chỉ xem lịch sử rút tiền của bản thân
    const myPayouts = db.payouts.filter(p => p.ctvId === req.user.ctvId);
    res.json(myPayouts);
  }
});

// CTV tạo yêu cầu rút tiền mới
router.post('/', verifyToken, (req, res) => {
  const { amount, bankName, accountNumber, accountHolder } = req.body;
  if (!amount || !bankName || !accountNumber || !accountHolder) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin tài khoản rút tiền.' });
  }

  const withdrawAmount = Number(amount);
  if (withdrawAmount <= 0) {
    return res.status(400).json({ message: 'Số tiền rút phải lớn hơn 0đ.' });
  }

  const db = readDb();
  const ctvIndex = db.collaborators.findIndex(c => c.id === req.user.ctvId);
  if (ctvIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy thông tin CTV.' });
  }

  const ctv = db.collaborators[ctvIndex];
  if (ctv.balance < withdrawAmount) {
    return res.status(400).json({ message: 'Số dư tài khoản không đủ để thực hiện giao dịch này.' });
  }

  // 1. Khấu trừ số dư ví CTV tạm thời
  db.collaborators[ctvIndex].balance -= withdrawAmount;

  // 2. Tạo bản ghi Payout
  const newPayout = {
    id: getNextId('payouts'),
    ctvId: req.user.ctvId,
    amount: withdrawAmount,
    bankName,
    accountNumber,
    accountHolder,
    status: 'pending',
    rejectReason: '',
    transactionId: '',
    requestedAt: new Date().toISOString(),
    resolvedAt: null
  };

  db.payouts.unshift(newPayout);
  writeDb(db);

  res.status(201).json({
    payout: newPayout,
    newBalance: db.collaborators[ctvIndex].balance
  });
});

// Admin xác nhận Đã Thanh toán (Thành công)
router.patch('/:id/pay', verifyToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ message: 'Vui lòng nhập mã giao dịch ngân hàng làm bằng chứng chuyển khoản.' });
  }

  const db = readDb();
  const payoutIndex = db.payouts.findIndex(p => p.id === id);
  if (payoutIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy yêu cầu thanh toán.' });
  }

  const payout = db.payouts[payoutIndex];
  if (payout.status !== 'pending') {
    return res.status(400).json({ message: 'Yêu cầu rút tiền này đã được xử lý trước đó.' });
  }

  // Cập nhật trạng thái
  db.payouts[payoutIndex].status = 'paid';
  db.payouts[payoutIndex].transactionId = transactionId;
  db.payouts[payoutIndex].resolvedAt = new Date().toISOString();

  writeDb(db);
  res.json(db.payouts[payoutIndex]);
});

// Admin từ chối yêu cầu rút tiền (Hoàn tiền lại vào ví CTV)
router.patch('/:id/reject', verifyToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { rejectReason } = req.body;

  if (!rejectReason) {
    return res.status(400).json({ message: 'Vui lòng cung cấp lý do từ chối yêu cầu.' });
  }

  const db = readDb();
  const payoutIndex = db.payouts.findIndex(p => p.id === id);
  if (payoutIndex === -1) {
    return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });
  }

  const payout = db.payouts[payoutIndex];
  if (payout.status !== 'pending') {
    return res.status(400).json({ message: 'Yêu cầu rút tiền này đã được xử lý trước đó.' });
  }

  // Hoàn trả lại tiền vào ví CTV
  const ctvIndex = db.collaborators.findIndex(c => c.id === payout.ctvId);
  if (ctvIndex !== -1) {
    db.collaborators[ctvIndex].balance += payout.amount;
  }

  // Cập nhật trạng thái
  db.payouts[payoutIndex].status = 'rejected';
  db.payouts[payoutIndex].rejectReason = rejectReason;
  db.payouts[payoutIndex].resolvedAt = new Date().toISOString();

  writeDb(db);
  res.json({
    payout: db.payouts[payoutIndex],
    ctvBalance: ctvIndex !== -1 ? db.collaborators[ctvIndex].balance : null
  });
});

export default router;
