import express from 'express';
import { readDb, writeDb } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const getVisibleNotifications = (db, user) => {
  const notifications = db.notifications || [];
  if (user.role === 'admin') {
    return notifications.filter(n => n.recipientRole === 'admin');
  }
  return notifications.filter(n => (
    n.recipientRole === 'collaborator' && n.recipientCtvId === user.ctvId
  ));
};

router.get('/', verifyToken, (req, res) => {
  const db = readDb();
  res.json(getVisibleNotifications(db, req.user).slice(0, 100));
});

router.patch('/read-all', verifyToken, (req, res) => {
  const db = readDb();
  const visibleIds = new Set(getVisibleNotifications(db, req.user).map(n => n.id));
  const now = new Date().toISOString();
  let updated = 0;

  db.notifications = db.notifications || [];
  db.notifications.forEach(notification => {
    if (visibleIds.has(notification.id) && !notification.readAt) {
      notification.readAt = now;
      updated += 1;
    }
  });

  writeDb(db);
  res.json({ updated });
});

router.patch('/:id/read', verifyToken, (req, res) => {
  const id = Number(req.params.id);
  const db = readDb();
  const visibleIds = new Set(getVisibleNotifications(db, req.user).map(n => n.id));
  const notification = (db.notifications || []).find(n => n.id === id);

  if (!notification || !visibleIds.has(id)) {
    return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
  }

  notification.readAt = notification.readAt || new Date().toISOString();
  writeDb(db);
  res.json(notification);
});

export default router;
