import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getAvailableAssets,
  createEmergencyRequest,
  getRequestsSubmittedBy,
  getIncomingRequests,
  getRequestDetails,
  approveRequest,
  denyRequest,
  requestVerification
} from '../controllers/emergencyAccessController.js';

const router = Router();

router.use(authenticate);

router.get('/available', getAvailableAssets);
router.post('/request', createEmergencyRequest);
router.get('/my-requests', getRequestsSubmittedBy);
router.get('/incoming', getIncomingRequests);
router.get('/:id', getRequestDetails);
router.post('/:id/approve', approveRequest);
router.post('/:id/deny', denyRequest);
router.post('/:id/request-verification', requestVerification);

export default router;
