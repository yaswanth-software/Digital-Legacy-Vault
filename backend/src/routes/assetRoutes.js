import { Router } from 'express';
import {
  createAsset,
  getAssets,
  getAssetById,
  updateAsset,
  archiveAsset,
  restoreAsset,
  deleteAsset,
} from '../controllers/assetController.js';

const router = Router({ mergeParams: true });

// POST /api/vault/assets — Create asset
router.post('/', createAsset);

// GET /api/vault/assets — List assets (with query parameters)
router.get('/', getAssets);

// GET /api/vault/assets/:assetId — Get asset details
router.get('/:assetId', getAssetById);

// PATCH /api/vault/assets/:assetId — Update asset metadata
router.patch('/:assetId', updateAsset);

// PATCH /api/vault/assets/:assetId/archive — Soft delete (archive) asset
router.patch('/:assetId/archive', archiveAsset);

// PATCH /api/vault/assets/:assetId/restore — Restore archived asset
router.patch('/:assetId/restore', restoreAsset);

// DELETE /api/vault/assets/:assetId — Permanently delete asset
router.delete('/:assetId', deleteAsset);

import fileRoutes from './fileRoutes.js';
router.use('/:assetId/files', fileRoutes);

export default router;
