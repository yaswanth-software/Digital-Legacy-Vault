import * as fileService from '../services/fileService.js';
import { getOrCreatePrimaryVault } from '../services/vaultService.js';
import env from '../config/env.js';

// Configuration parameters
const MAX_FILE_SIZE_B = (env.firebase.maxFileSizeMb || 10) * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = env.firebase.maxFilesPerUpload || 5;

// Allowed file extensions and mime types mapping
const ALLOWED_MAPPING = {
  // Documents
  'pdf': 'application/pdf',
  'txt': 'text/plain',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'webp': 'image/webp',
  // Spreadsheets
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'csv': 'text/csv'
};

const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'js', 'msi', 'dll', 'scr', 'com', 
  'vbs', 'pif', 'cpl', 'wsf', 'jar', 'gadget', 'py', 'ps1'
];

/**
 * Validate a file's extension and MIME type.
 * Returns null if valid, or a string error message if invalid.
 */
function validateFile(file) {
  if (!file.originalname || typeof file.originalname !== 'string') {
    return 'Invalid file name.';
  }

  const parts = file.originalname.split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';

  // 1. Block dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(ext) || !ext) {
    return `The file extension ".${ext || 'unknown'}" is blocked for security reasons.`;
  }

  // 2. Validate against allowed extensions and MIME types
  const expectedMime = ALLOWED_MAPPING[ext];
  if (!expectedMime) {
    return `This file type (.${ext}) is not supported. Please upload PDFs, images, text, or office documents.`;
  }

  // Allow sub-type mappings or generic checks where practical
  const mimeType = file.mimetype;
  if (mimeType !== expectedMime) {
    // Basic structural checks: e.g. text/plain can match txt, etc.
    // Excel/Word sometimes have slightly variant MIME types depending on OS. Let's allow minor deviations but ensure no scripts.
    if (ext === 'csv' && (mimeType === 'text/plain' || mimeType === 'application/csv')) {
      return null;
    }
    if (ext === 'txt' && mimeType === 'text/plain') {
      return null;
    }
    console.warn(`MIME type mismatch for .${ext}: Expected ${expectedMime}, got ${mimeType}`);
    return `Invalid file content signature. The extension ".${ext}" does not match its MIME type.`;
  }

  // 3. File size check
  if (file.size > MAX_FILE_SIZE_B) {
    return `File is too large. Maximum size is ${env.firebase.maxFileSizeMb || 10} MB.`;
  }

  return null;
}

/**
 * POST /api/vault/assets/:assetId/files
 * Handle uploading files (multiple files allowed, up to limit)
 */
export async function uploadFiles(req, res, next) {
  try {
    const uid = req.user.uid;
    const { assetId } = req.params;
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files selected for upload.',
      });
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return res.status(400).json({
        success: false,
        message: `You can upload a maximum of ${MAX_FILES_PER_UPLOAD} files at a time.`,
      });
    }

    // Validate all files before doing any upload operations
    const validationErrors = [];
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(`${file.originalname}: ${error}`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'File validation failed.',
        errors: validationErrors,
      });
    }

    // Get the user's primary vault ID
    const vault = await getOrCreatePrimaryVault(uid);

    // Upload files sequentially
    const uploadedMetadataList = [];
    for (const file of files) {
      const metadata = await fileService.uploadFile(uid, vault.id, assetId, file);
      uploadedMetadataList.push(metadata);
    }

    res.status(201).json({
      success: true,
      message: 'Files uploaded successfully.',
      data: { files: uploadedMetadataList },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/vault/assets/:assetId/files
 * Retrieve all files linked to the asset.
 */
export async function getFiles(req, res, next) {
  try {
    const uid = req.user.uid;
    const { assetId } = req.params;

    const vault = await getOrCreatePrimaryVault(uid);
    const files = await fileService.getFiles(uid, vault.id, assetId);

    res.json({
      success: true,
      data: { files },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/vault/assets/:assetId/files/:fileId
 * Retrieve detailed metadata of a file.
 */
export async function getFileById(req, res, next) {
  try {
    const uid = req.user.uid;
    const { assetId, fileId } = req.params;

    const vault = await getOrCreatePrimaryVault(uid);
    const file = await fileService.getFileById(uid, vault.id, assetId, fileId);

    res.json({
      success: true,
      data: { file },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * GET /api/vault/assets/:assetId/files/:fileId/download
 * Generate a secure signed URL to download or open the file.
 */
export async function downloadFile(req, res, next) {
  try {
    const uid = req.user.uid;
    const { assetId, fileId } = req.params;

    const vault = await getOrCreatePrimaryVault(uid);
    const result = await fileService.downloadFile(uid, vault.id, assetId, fileId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/vault/assets/:assetId/files/:fileId
 * Delete a file.
 */
export async function deleteFile(req, res, next) {
  try {
    const uid = req.user.uid;
    const { assetId, fileId } = req.params;

    const vault = await getOrCreatePrimaryVault(uid);
    const result = await fileService.deleteFile(uid, vault.id, assetId, fileId);

    res.json({
      success: true,
      message: 'File deleted successfully.',
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}
