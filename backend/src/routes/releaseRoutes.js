import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  getReleases,
  getReleaseDetails,
  revokeRelease,
  expireReleases,
  getReleaseActivityLogs
} from '../controllers/controlledReleaseController.js';
import {
  getReleaseAssets,
  getReleaseAssetDetails,
  getSecureFileAccess
} from '../controllers/releaseAccessController.js';

const router = Router();

router.use(authenticate);

router.get('/', getReleases);
router.post('/expire-check', expireReleases); // manual check endpoint for development
router.get('/:id', getReleaseDetails);
router.get('/:id/assets', getReleaseAssets);
router.get('/:id/assets/:assetId', getReleaseAssetDetails);
router.post('/:id/revoke', revokeRelease);
router.get('/:id/activity', getReleaseActivityLogs);

// Secure File Access sub-routes
router.get('/:releaseId/assets/:assetId/files/:fileId/access', getSecureFileAccess);

export default router;
