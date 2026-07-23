import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getMe } from '../controllers/userController.js';

const router = Router();

// GET /api/users/me — Get authenticated user's profile
router.get('/me', authenticate, getMe);

export default router;
