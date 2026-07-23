import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { previewInvitation, acceptInvitation } from '../controllers/invitationController.js';

const router = Router();

// GET /api/invitations/preview — Public preview of invite details
router.get('/preview', previewInvitation);

// POST /api/invitations/accept — Accept invite (requires authentication)
router.post('/accept', authenticate, acceptInvitation);

export default router;
