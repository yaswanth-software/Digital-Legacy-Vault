import { Router } from 'express';
import multer from 'multer';
import {
  uploadFiles,
  getFiles,
  getFileById,
  downloadFile,
  deleteFile
} from '../controllers/fileController.js';

// Setup multer memory storage (buffers files in RAM, doesn't touch local filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // Pre-check size limit of 10MB per file in multer
  }
});

const router = Router({ mergeParams: true });

// POST /api/vault/assets/:assetId/files — Upload one or multiple files (max 5)
router.post('/', upload.array('files', 5), uploadFiles);

// GET /api/vault/assets/:assetId/files — List files attached to this asset
router.get('/', getFiles);

// GET /api/vault/assets/:assetId/files/:fileId — Get file metadata details
router.get('/:fileId', getFileById);

// GET /api/vault/assets/:assetId/files/:fileId/download — Generate short-lived download URL
router.get('/:fileId/download', downloadFile);

// DELETE /api/vault/assets/:assetId/files/:fileId — Delete file from Storage and Firestore
router.delete('/:fileId', deleteFile);

export default router;
