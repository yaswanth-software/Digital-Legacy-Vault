import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { securityApiLimiter } from '../middleware/rateLimitMiddleware.js';
import {
  exportUserData,
  getPrivacySummary,
  deleteAccount
} from '../controllers/privacyController.js';

const router = Router();

router.use(authenticate);
router.use(securityApiLimiter);

router.get('/summary', getPrivacySummary);
router.post('/export', exportUserData);
router.post('/account/delete', deleteAccount);

export default router;
