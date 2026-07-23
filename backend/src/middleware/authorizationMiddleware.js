import * as authzService from '../services/authorizationService.js';
import { getOrCreatePrimaryVault } from '../services/vaultService.js';

/**
 * Middleware: Enforce that authenticated user is the Vault Owner.
 */
export async function requireVaultOwner(req, res, next) {
  try {
    const { uid } = req.user;
    let vaultId = req.params.vaultId || req.body.vaultId || req.query.vaultId;

    if (!vaultId) {
      const primaryVault = await getOrCreatePrimaryVault(uid);
      vaultId = primaryVault.id;
      req.vaultId = vaultId;
    }

    const isOwner = await authzService.isVaultOwner(uid, vaultId);
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Vault owner authorization required.'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Enforce asset view authorization.
 */
export async function requireAssetAccess(req, res, next) {
  try {
    const { uid } = req.user;
    const { assetId, id: releaseId } = req.params;
    const vaultId = req.vaultId || req.params.vaultId;

    if (!vaultId || !assetId) {
      return res.status(400).json({ success: false, message: 'Vault ID and Asset ID are required.' });
    }

    const allowed = await authzService.canViewAsset(uid, vaultId, assetId, releaseId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to access this asset.' });
    }

    next();
  } catch (error) {
    next(error);
  }
}
