import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  createTrustedPerson,
  getTrustedPeople,
  getTrustedPersonById,
  updateTrustedPerson,
  revokeTrustedPerson,
  softRemoveTrustedPerson
} from '../controllers/trustedPersonController.js';
import {
  getPermissions,
  configurePermission,
  updatePermission,
  deletePermission
} from '../controllers/accessPermissionController.js';
import { resendInvitation } from '../controllers/invitationController.js';

const router = Router();

// Secure all endpoints in this route file
router.use(authenticate);

// --- Trusted Person Routes ---
router.post('/', createTrustedPerson);
router.get('/', getTrustedPeople);
router.get('/:id', getTrustedPersonById);
router.patch('/:id', updateTrustedPerson);
router.delete('/:id', softRemoveTrustedPerson);

router.post('/:id/resend-invitation', resendInvitation);
router.post('/:id/revoke', revokeTrustedPerson);

// --- Access Permission sub-routes ---
router.get('/:trustedPersonId/access', getPermissions);
router.post('/:trustedPersonId/access', configurePermission);
router.patch('/:trustedPersonId/access/:permissionId', updatePermission);
router.delete('/:trustedPersonId/access/:permissionId', deletePermission);

export default router;
