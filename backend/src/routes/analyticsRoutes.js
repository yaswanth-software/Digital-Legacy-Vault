import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getDashboardOverview } from '../controllers/analyticsController.js';

const router = Router();
router.use(authenticate);

router.get('/overview', getDashboardOverview);

export default router;
