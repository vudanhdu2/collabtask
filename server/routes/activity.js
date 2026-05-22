import express from 'express';
import { readDb } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, (req, res) => {
  const db = readDb();
  const logs = db.activityLogs || [];

  if (req.user.role === 'admin') {
    return res.json(logs.slice(0, 100));
  }

  res.json(logs.filter(log => (
    log.metadata?.ctvId === req.user.ctvId ||
    log.actorId === req.user.id
  )).slice(0, 100));
});

export default router;
