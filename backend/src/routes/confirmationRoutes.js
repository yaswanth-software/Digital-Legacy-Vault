import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getConfirmations,
  getConfirmationById,
  confirm,
  decline
} from '../controllers/confirmationController.js';

const router = Router();

router.use(authenticate);

router.get('/', getConfirmations);
router.get('/:id', getConfirmationById);
router.post('/:id/confirm', confirm);
router.post('/:id/decline', decline);

export default router;
