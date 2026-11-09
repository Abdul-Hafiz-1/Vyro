import { Router, Response } from 'express';
import { store } from '../db/store.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/rbac.js';

const router = Router();
router.use(authenticateUser);

// GET /api/v1/notifications
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const notifications = store.getNotifications(req.user!.id);

  res.json({
    success: true,
    data: notifications
  });
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', (req: AuthenticatedRequest, res: Response) => {
  const notification = store.getNotification(req.params.id);
  if (!notification || notification.userId !== req.user!.id) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found'
    });
  }

  const success = store.markNotificationRead(req.params.id);
  res.json({
    success,
    message: success ? 'Notification marked as read' : 'Notification not found'
  });
});

export default router;
