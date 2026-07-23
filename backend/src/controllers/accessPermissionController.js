import * as accessPermissionService from '../services/accessPermissionService.js';
import { getOrCreatePrimaryVault } from '../services/vaultService.js';

/**
 * GET /api/trusted-people/:trustedPersonId/access
 * Get permissions configured for a trusted person.
 */
export async function getPermissions(req, res, next) {
  try {
    const { uid } = req.user;
    const { trustedPersonId } = req.params;
    const vault = await getOrCreatePrimaryVault(uid);

    const permissions = await accessPermissionService.getPermissions(uid, vault.id, trustedPersonId);

    res.json({
      success: true,
      data: { permissions },
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
 * POST /api/trusted-people/:trustedPersonId/access
 * Create or configure permission for a specific asset.
 */
export async function configurePermission(req, res, next) {
  try {
    const { uid } = req.user;
    const { trustedPersonId } = req.params;
    const { assetId, accessLevel, releaseMode, emergencyAccessEnabled, emergencyVerificationLevel } = req.body;
    const vault = await getOrCreatePrimaryVault(uid);

    if (!assetId) {
      return res.status(400).json({
        success: false,
        message: 'assetId is required.',
      });
    }

    const result = await accessPermissionService.configurePermission(
      uid,
      vault.id,
      trustedPersonId,
      assetId,
      { accessLevel, releaseMode, emergencyAccessEnabled, emergencyVerificationLevel }
    );

    res.status(200).json({
      success: true,
      message: 'Access permissions updated successfully.',
      data: { permission: result },
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
 * PATCH /api/trusted-people/:trustedPersonId/access/:permissionId
 * Update details of a permission configuration.
 */
export async function updatePermission(req, res, next) {
  try {
    const { uid } = req.user;
    const { trustedPersonId, permissionId } = req.params;
    const { accessLevel, releaseMode, emergencyAccessEnabled, emergencyVerificationLevel } = req.body;
    const vault = await getOrCreatePrimaryVault(uid);

    const result = await accessPermissionService.updatePermission(
      uid,
      vault.id,
      trustedPersonId,
      permissionId,
      { accessLevel, releaseMode, emergencyAccessEnabled, emergencyVerificationLevel }
    );

    res.json({
      success: true,
      message: 'Permission details updated successfully.',
      data: { permission: result },
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
 * DELETE /api/trusted-people/:trustedPersonId/access/:permissionId
 * Delete/Revoke a configured permission.
 */
export async function deletePermission(req, res, next) {
  try {
    const { uid } = req.user;
    const { trustedPersonId, permissionId } = req.params;
    const vault = await getOrCreatePrimaryVault(uid);

    const result = await accessPermissionService.deletePermission(
      uid,
      vault.id,
      trustedPersonId,
      permissionId
    );

    res.json({
      success: true,
      message: 'Access permission revoked successfully.',
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
