import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { securityApiLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  getSecurityOverview,
  getSecurityEvents,
  acknowledgeSecurityEvent
} from '../controllers/securityController.js';

const router = Router();

router.use(authenticate);
router.use(securityApiLimiter);

router.get('/overview', getSecurityOverview);
router.get('/events', getSecurityEvents);
router.post('/events/:id/acknowledge', acknowledgeSecurityEvent);

export default router;
