import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getActivityLogs } from '../controllers/activityController.js';

const router = Router();
router.use(authenticate);

router.get('/', getActivityLogs);

export default router;
