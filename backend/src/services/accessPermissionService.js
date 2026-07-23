import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { logAuditEvent, getTrustedPersonById } from './trustedPersonService.js';

const vaultsCollection = firestoreAdmin ? firestoreAdmin.collection('vaults') : null;

// Presets validation lists
const ACCESS_LEVELS = ['metadata_only', 'view', 'download', 'no_access'];
const RELEASE_MODES = ['manual', 'future_rule'];

/**
 * Verify complete ownership chain:
 * 1. Authenticated user owns the vault
 * 2. Trusted person exists and belongs to the vault
 * 3. Asset exists and belongs to the vault
 */
async function verifyAccessChain(uid, vaultId, trustedPersonId, assetId = null) {
  // 1. Vault check
  const vaultDoc = await vaultsCollection.doc(vaultId).get();
  if (!vaultDoc.exists) {
    const error = new Error('Vault not found.');
    error.status = 404;
    throw error;
  }
  const vault = vaultDoc.data();
  if (vault.ownerId !== uid) {
    const error = new Error('Unauthorized. You do not own this vault.');
    error.status = 403;
    throw error;
  }

  // 2. Trusted Person check
  const tp = await getTrustedPersonById(uid, vaultId, trustedPersonId);
  if (tp.removedAt) {
    const error = new Error('This trusted person is no longer active.');
    error.status = 400;
    throw error;
  }

  // 3. Asset check (optional if just listing permissions)
  if (assetId) {
    const assetDoc = await vaultsCollection.doc(vaultId).collection('assets').doc(assetId).get();
    if (!assetDoc.exists) {
      const error = new Error('Asset not found.');
      error.status = 404;
      throw error;
    }
    const asset = assetDoc.data();
    if (asset.ownerId !== uid) {
      const error = new Error('Unauthorized. You do not own this asset.');
      error.status = 403;
      throw error;
    }
    if (asset.status === 'archived') {
      const error = new Error('Cannot configure permissions for archived assets.');
      error.status = 400;
      throw error;
    }
  }

  return tp;
}

/**
 * Get all permissions configured for a trusted person.
 */
export async function getPermissions(uid, vaultId, trustedPersonId) {
  await verifyAccessChain(uid, vaultId, trustedPersonId);

  const permissionsRef = vaultsCollection.doc(vaultId).collection('accessPermissions');
  const snapshot = await permissionsRef.where('trustedPersonId', '==', trustedPersonId).get();
  return snapshot.docs.map(doc => doc.data());
}

/**
 * Upsert (Create or Update) permission for a specific trusted person and asset.
 * If accessLevel is "no_access", delete any existing permission document.
 */
export async function configurePermission(uid, vaultId, trustedPersonId, assetId, data) {
  await verifyAccessChain(uid, vaultId, trustedPersonId, assetId);

  const accessLevel = data.accessLevel;
  const releaseMode = data.releaseMode || 'manual';

  if (!ACCESS_LEVELS.includes(accessLevel)) {
    const error = new Error(`Invalid accessLevel. Must be one of: ${ACCESS_LEVELS.join(', ')}`);
    error.status = 400;
    throw error;
  }

  if (!RELEASE_MODES.includes(releaseMode)) {
    const error = new Error(`Invalid releaseMode. Must be one of: ${RELEASE_MODES.join(', ')}`);
    error.status = 400;
    throw error;
  }

  const permissionsRef = vaultsCollection.doc(vaultId).collection('accessPermissions');
  
  // Look up if permission already exists for this asset
  const existingQuery = await permissionsRef
    .where('trustedPersonId', '==', trustedPersonId)
    .where('assetId', '==', assetId)
    .limit(1)
    .get();

  const isExisting = !existingQuery.empty;
  const permissionRef = isExisting ? existingQuery.docs[0].ref : permissionsRef.doc();
  const permissionId = permissionRef.id;

  // Case 1: "no_access" means delete permission if it exists
  if (accessLevel === 'no_access') {
    if (isExisting) {
      await permissionRef.delete();
      await logAuditEvent(vaultId, uid, uid, 'permission_revoked', 'permission', permissionId);
    }
    return { assetId, accessLevel: 'no_access', status: 'revoked' };
  }

  const emergencyAccessEnabled = data.emergencyAccessEnabled !== undefined ? !!data.emergencyAccessEnabled : false;
  const emergencyVerificationLevel = data.emergencyVerificationLevel || 'high';

  if (!['basic', 'standard', 'high'].includes(emergencyVerificationLevel)) {
    const error = new Error('Invalid emergencyVerificationLevel. Must be basic, standard, or high.');
    error.status = 400;
    throw error;
  }

  // Case 2: Save configured level
  const permissionPayload = {
    id: permissionId,
    ownerId: uid,
    vaultId,
    trustedPersonId,
    assetId,
    accessLevel,
    releaseMode,
    emergencyAccessEnabled,
    emergencyVerificationLevel,
    status: 'configured', // configured but not active/released
    createdAt: isExisting ? existingQuery.docs[0].data().createdAt : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await permissionRef.set(permissionPayload);
  await logAuditEvent(
    vaultId,
    uid,
    uid,
    isExisting ? 'permission_updated' : 'permission_created',
    'permission',
    permissionId
  );

  return permissionPayload;
}

/**
 * Update detailed settings on a permission document.
 */
export async function updatePermission(uid, vaultId, trustedPersonId, permissionId, data) {
  await verifyAccessChain(uid, vaultId, trustedPersonId);

  const permissionRef = vaultsCollection.doc(vaultId).collection('accessPermissions').doc(permissionId);
  const permDoc = await permissionRef.get();

  if (!permDoc.exists) {
    const error = new Error('Permission configuration not found.');
    error.status = 404;
    throw error;
  }

  const perm = permDoc.data();
  if (perm.ownerId !== uid || perm.trustedPersonId !== trustedPersonId) {
    const error = new Error('Unauthorized access to permission details.');
    error.status = 403;
    throw error;
  }

  const accessLevel = data.accessLevel;
  if (accessLevel !== undefined) {
    if (!ACCESS_LEVELS.includes(accessLevel)) {
      const error = new Error(`Invalid accessLevel.`);
      error.status = 400;
      throw error;
    }

    if (accessLevel === 'no_access') {
      await permissionRef.delete();
      await logAuditEvent(vaultId, uid, uid, 'permission_revoked', 'permission', permissionId);
      return { id: permissionId, accessLevel: 'no_access', deleted: true };
    }
  }

  const allowedUpdates = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (data.accessLevel !== undefined) allowedUpdates.accessLevel = data.accessLevel;
  if (data.releaseMode !== undefined) {
    if (!RELEASE_MODES.includes(data.releaseMode)) {
      const error = new Error(`Invalid releaseMode.`);
      error.status = 400;
      throw error;
    }
    allowedUpdates.releaseMode = data.releaseMode;
  }
  if (data.emergencyAccessEnabled !== undefined) {
    allowedUpdates.emergencyAccessEnabled = !!data.emergencyAccessEnabled;
  }
  if (data.emergencyVerificationLevel !== undefined) {
    if (!['basic', 'standard', 'high'].includes(data.emergencyVerificationLevel)) {
      const error = new Error('Invalid emergencyVerificationLevel.');
      error.status = 400;
      throw error;
    }
    allowedUpdates.emergencyVerificationLevel = data.emergencyVerificationLevel;
  }

  await permissionRef.update(allowedUpdates);
  await logAuditEvent(vaultId, uid, uid, 'permission_updated', 'permission', permissionId);

  const updatedDoc = await permissionRef.get();
  return updatedDoc.data();
}

/**
 * Remove/delete a permission.
 */
export async function deletePermission(uid, vaultId, trustedPersonId, permissionId) {
  await verifyAccessChain(uid, vaultId, trustedPersonId);

  const permissionRef = vaultsCollection.doc(vaultId).collection('accessPermissions').doc(permissionId);
  const permDoc = await permissionRef.get();

  if (!permDoc.exists) {
    const error = new Error('Permission configuration not found.');
    error.status = 404;
    throw error;
  }

  const perm = permDoc.data();
  if (perm.ownerId !== uid || perm.trustedPersonId !== trustedPersonId) {
    const error = new Error('Unauthorized to manage this permission.');
    error.status = 403;
    throw error;
  }

  await permissionRef.delete();
  await logAuditEvent(vaultId, uid, uid, 'permission_revoked', 'permission', permissionId);

  return { id: permissionId, deleted: true };
}
