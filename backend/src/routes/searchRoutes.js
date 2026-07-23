import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { searchVault } from '../controllers/searchController.js';

const router = Router();
router.use(authenticate);

router.get('/', searchVault);

export default router;
