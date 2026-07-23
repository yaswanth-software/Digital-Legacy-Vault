import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { getVault, createVault, patchVault } from '../controllers/vaultController.js';
import assetRoutes from './assetRoutes.js';

const router = Router();

// Secure all endpoints in this route file
router.use(authenticate);

// GET /api/vault — Get user's primary vault
router.get('/', getVault);

// POST /api/vault — Create user's primary vault (if it does not exist)
router.post('/', createVault);

// PATCH /api/vault — Update user's primary vault details
router.patch('/', patchVault);

// Nest asset routes under /api/vault/assets
router.use('/assets', assetRoutes);

export default router;
