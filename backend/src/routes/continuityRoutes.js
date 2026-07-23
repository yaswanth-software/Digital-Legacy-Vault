import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getSettings,
  updateSettings,
  checkIn,
  getStatus,
  getHistory,
  pause,
  resume
} from '../controllers/continuityController.js';

const router = Router();

// Owner authenticated routes
router.use(authenticate);

router.get('/settings', getSettings);
router.post('/settings', getSettings); // initialization fallback
router.patch('/settings', updateSettings);
router.get('/status', getStatus);
router.post('/check-in', checkIn);
router.get('/history', getHistory);
router.post('/pause', pause);
router.post('/resume', resume);

export default router;
