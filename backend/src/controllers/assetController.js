import {
  createAsset as createAssetService,
  getAssets as getAssetsService,
  getAssetById as getAssetByIdService,
  updateAsset as updateAssetService,
  archiveAsset as archiveAssetService,
  restoreAsset as restoreAssetService,
  deleteAsset as deleteAssetService,
} from '../services/assetService.js';
import { getOrCreatePrimaryVault } from '../services/vaultService.js';

const VALID_CATEGORIES = [
  'important_documents',
  'financial',
  'property',
  'insurance',
  'digital_accounts',
  'personal_memories',
  'personal_messages',
  'final_instructions',
  'other',
];

const VALID_ASSET_TYPES = [
  'document',
  'account',
  'instruction',
  'message',
  'memory',
  'other',
];

const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

/**
 * Validate asset data fields.
 * Returns an array of error messages or empty array if valid.
 */
function validateAssetData(data, isUpdate = false) {
  const errors = [];

  // For update, fields might be optional if we only send changed ones,
  // but for our PUT/PATCH we'll require name, category, assetType to be valid if provided.
  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
      errors.push('Asset name is required and must be at least 2 characters long.');
    } else if (data.name.length > 200) {
      errors.push('Asset name must be less than 200 characters.');
    }
  }

  if (!isUpdate || data.category !== undefined) {
    if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
      errors.push(`Category is required and must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
  }

  if (!isUpdate || data.assetType !== undefined) {
    if (!data.assetType || !VALID_ASSET_TYPES.includes(data.assetType)) {
      errors.push(`Asset type is required and must be one of: ${VALID_ASSET_TYPES.join(', ')}`);
    }
  }

  if (data.priority !== undefined && !VALID_PRIORITIES.includes(data.priority)) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array.');
    } else {
      if (data.tags.length > 20) {
        errors.push('An asset cannot have more than 20 tags.');
      }
      for (const tag of data.tags) {
        if (typeof tag !== 'string' || tag.trim().length === 0) {
          errors.push('Each tag must be a non-empty string.');
        } else if (tag.length > 30) {
          errors.push('Each tag must be less than 30 characters.');
        }
      }
    }
  }

  if (data.description !== undefined && typeof data.description === 'string' && data.description.length > 2000) {
    errors.push('Description cannot exceed 2000 characters.');
  }

  if (data.notes !== undefined && typeof data.notes === 'string' && data.notes.length > 2000) {
    errors.push('Notes cannot exceed 2000 characters.');
  }

  return errors;
}

/**
 * POST /api/vault/assets
 * Create a new asset under the authenticated user's primary vault.
 */
export async function createAsset(req, res, next) {
  try {
    const uid = req.user.uid;
    const validationErrors = validateAssetData(req.body, false);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    // Resolve primary vault ID
    const vault = await getOrCreatePrimaryVault(uid);
    const asset = await createAssetService(uid, vault.id, req.body);

    res.status(201).json({
      success: true,
      data: { asset },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/vault/assets
 * Retrieve list of assets under the user's primary vault with optional filters.
 */
export async function getAssets(req, res, next) {
  try {
    const uid = req.user.uid;
    const vault = await getOrCreatePrimaryVault(uid);
    
    const assets = await getAssetsService(uid, vault.id, req.query);

    res.json({
      success: true,
      data: { assets },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/vault/assets/:assetId
 * Retrieve details of a specific asset from the user's primary vault.
 */
export async function getAssetById(req, res, next) {
  try {
    const uid = req.user.uid;
    const { assetId } = req.params;

    const vault = await getOrCreatePrimaryVault(uid);
    const asset = await getAssetByIdService(uid, vault.id, assetId);

    res.json({
      success: true,
      data: { asset },
    });
  } catch (error) {
    // If the error has a status, we pass it down, otherwise next handles it as 500.
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
 * PATCH /api/vault/assets/:assetId
 * Update details of a specific asset.
 */
export async function updateAsset(req, res, next) {
  try {
    const uid = req.user.uid;
    const { assetId } = req.params;

    const validationErrors = validateAssetData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    const vault = await getOrCreatePrimaryVault(uid);
    const updatedAsset = await updateAssetService(uid, vault.id, assetId, req.body);

    res.json({
      success: true,
      data: { asset: updatedAsset },
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
 * PATCH /api/vault/assets/:assetId/archive
 * Archive an asset (soft delete).
 */
export async function archiveAsset(req, res, next) {
  try {
    const uid = req.user.uid;
    const { assetId } = req.params;

    const vault = await getOrCreatePrimaryVault(uid);
    const archivedAsset = await archiveAssetService(uid, vault.id, assetId);

    res.json({
      success: true,
      data: { asset: archivedAsset },
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
 * PATCH /api/vault/assets/:assetId/restore
 * Restore an archived asset to active.
 */
export async function restoreAsset(req, res, next) {
  try {
    const uid = req.user.uid;
    const { assetId } = req.params;

    const vault = await getOrCreatePrimaryVault(uid);
    const restoredAsset = await restoreAssetService(uid, vault.id, assetId);

    res.json({
      success: true,
      data: { asset: restoredAsset },
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
 * DELETE /api/vault/assets/:assetId
 * Permanently delete an asset document.
 */
export async function deleteAsset(req, res, next) {
  try {
    const uid = req.user.uid;
    const { assetId } = req.params;

    const vault = await getOrCreatePrimaryVault(uid);
    const result = await deleteAssetService(uid, vault.id, assetId);

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
