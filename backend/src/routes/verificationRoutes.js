import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getVerificationDetails,
  startVerification,
  completeVerificationStep,
  cancelVerification
} from '../controllers/verificationController.js';

const router = Router();

router.use(authenticate);

router.get('/:id', getVerificationDetails);
router.post('/:id/start', startVerification);
router.post('/:id/complete', completeVerificationStep);
router.post('/:id/cancel', cancelVerification);

export default router;
