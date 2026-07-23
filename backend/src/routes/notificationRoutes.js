import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import * as notificationService from '../services/notificationService.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { uid } = req.user;
    const { category, priority, unreadOnly, search, limit } = req.query;
    const notifications = await notificationService.getNotifications(uid, {
      category,
      priority,
      unreadOnly: unreadOnly === 'true',
      search,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    res.json({ success: true, data: { notifications } });
  } catch (error) {
    next(error);
  }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const { uid } = req.user;
    const count = await notificationService.getUnreadCount(uid);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    const { uid } = req.user;
    const result = await notificationService.markAllAsRead(uid);
    res.json({ success: true, message: 'All notifications marked as read.', data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const result = await notificationService.markAsRead(uid, id);
    res.json({ success: true, message: 'Notification marked as read.', data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const result = await notificationService.deleteNotification(uid, id);
    res.json({ success: true, message: 'Notification deleted.', data: result });
  } catch (error) {
    next(error);
  }
});

router.get('/settings', async (req, res, next) => {
  try {
    const { uid } = req.user;
    const preferences = await notificationService.getNotificationPreferences(uid);
    res.json({ success: true, data: { preferences } });
  } catch (error) {
    next(error);
  }
});

router.put('/settings', async (req, res, next) => {
  try {
    const { uid } = req.user;
    const preferences = await notificationService.updateNotificationPreferences(uid, req.body);
    res.json({ success: true, message: 'Notification preferences updated.', data: { preferences } });
  } catch (error) {
    next(error);
  }
});

export default router;
