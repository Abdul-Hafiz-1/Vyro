import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';

const router = Router();

// GET /api/v1/activity
router.get('/', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
  const events = store.getActivityEvents(limit);
  res.json({ success: true, count: events.length, data: events });
});

export default router;
