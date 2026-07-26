import { firestoreAdmin } from '../config/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const getVaultsCollection = () => {
  if (!firestoreAdmin) {
    const err = new Error('Database service is unavailable. Please set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel Environment Variables.');
    err.status = 503;
    throw err;
  }
  return firestoreAdmin.collection('vaults');
};

/**
 * Helper to verify that the vault exists and belongs to the user.
 * 
 * @param {string} uid - Firebase Auth User UID
 * @param {string} vaultId - Vault document ID
 * @throws {Error} If vault not found or not owned by user
 */
async function verifyVaultOwnership(uid, vaultId) {
  const vaultDoc = await getVaultsCollection().doc(vaultId).get();
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
}

/**
 * Create a new asset in the user's vault.
 */
export async function createAsset(uid, vaultId, assetData) {
  await verifyVaultOwnership(uid, vaultId);

  const assetRef = getVaultsCollection().doc(vaultId).collection('assets').doc();
  const assetId = assetRef.id;

  const newAsset = {
    id: assetId,
    ownerId: uid,
    vaultId: vaultId,
    name: assetData.name.trim(),
    description: (assetData.description || '').trim(),
    category: assetData.category,
    assetType: assetData.assetType,
    status: 'active',
    priority: assetData.priority || 'medium',
    tags: Array.isArray(assetData.tags) ? assetData.tags : [],
    notes: (assetData.notes || '').trim(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await assetRef.set(newAsset);
  const createdDoc = await assetRef.get();
  return createdDoc.data();
}

/**
 * Retrieve assets for the user's vault, applying optional query criteria.
 */
export async function getAssets(uid, vaultId, queryParams = {}) {
  await verifyVaultOwnership(uid, vaultId);

  const assetsCollectionRef = getVaultsCollection().doc(vaultId).collection('assets');
  const snapshot = await assetsCollectionRef.get();
  let assets = snapshot.docs.map(doc => doc.data());

  // Programmatic filtering to avoid composite indexing requirements
  const statusFilter = queryParams.status || 'active';
  if (statusFilter !== 'all') {
    assets = assets.filter(asset => asset.status === statusFilter);
  }

  if (queryParams.category) {
    assets = assets.filter(asset => asset.category === queryParams.category);
  }

  if (queryParams.priority) {
    assets = assets.filter(asset => asset.priority === queryParams.priority);
  }

  if (queryParams.assetType) {
    assets = assets.filter(asset => asset.assetType === queryParams.assetType);
  }

  if (queryParams.q) {
    const searchTerm = queryParams.q.toLowerCase().trim();
    assets = assets.filter(asset => 
      (asset.name && asset.name.toLowerCase().includes(searchTerm)) ||
      (asset.description && asset.description.toLowerCase().includes(searchTerm)) ||
      (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
  }

  return assets;
}

/**
 * Fetch a single asset from the user's vault.
 */
export async function getAssetById(uid, vaultId, assetId) {
  await verifyVaultOwnership(uid, vaultId);

  const assetRef = getVaultsCollection().doc(vaultId).collection('assets').doc(assetId);
  const assetDoc = await assetRef.get();

  if (!assetDoc.exists) {
    const error = new Error('Asset not found.');
    error.status = 404;
    throw error;
  }

  const asset = assetDoc.data();

  // Double check ownership
  if (asset.ownerId !== uid) {
    const error = new Error('Unauthorized. You do not own this asset.');
    error.status = 403;
    throw error;
  }

  return asset;
}

/**
 * Update asset fields (excluding ownerId, vaultId, and createdAt).
 */
export async function updateAsset(uid, vaultId, assetId, updateData) {
  await verifyVaultOwnership(uid, vaultId);

  const assetRef = getVaultsCollection().doc(vaultId).collection('assets').doc(assetId);
  const assetDoc = await assetRef.get();

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

  const allowedUpdates = {
    name: updateData.name.trim(),
    category: updateData.category,
    assetType: updateData.assetType,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (updateData.description !== undefined) {
    allowedUpdates.description = (updateData.description || '').trim();
  }
  if (updateData.priority !== undefined) {
    allowedUpdates.priority = updateData.priority;
  }
  if (updateData.tags !== undefined) {
    allowedUpdates.tags = Array.isArray(updateData.tags) ? updateData.tags : [];
  }
  if (updateData.notes !== undefined) {
    allowedUpdates.notes = (updateData.notes || '').trim();
  }

  await assetRef.update(allowedUpdates);
  const updatedDoc = await assetRef.get();
  return updatedDoc.data();
}

/**
 * Set asset status to 'archived' (soft delete).
 */
export async function archiveAsset(uid, vaultId, assetId) {
  await verifyVaultOwnership(uid, vaultId);

  const assetRef = getVaultsCollection().doc(vaultId).collection('assets').doc(assetId);
  const assetDoc = await assetRef.get();

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

  await assetRef.update({
    status: 'archived',
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await assetRef.get();
  return updatedDoc.data();
}

/**
 * Set asset status to 'active' (restore).
 */
export async function restoreAsset(uid, vaultId, assetId) {
  await verifyVaultOwnership(uid, vaultId);

  const assetRef = getVaultsCollection().doc(vaultId).collection('assets').doc(assetId);
  const assetDoc = await assetRef.get();

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

  await assetRef.update({
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await assetRef.get();
  return updatedDoc.data();
}

/**
 * Delete asset document permanently.
 */
export async function deleteAsset(uid, vaultId, assetId) {
  await verifyVaultOwnership(uid, vaultId);

  const assetRef = getVaultsCollection().doc(vaultId).collection('assets').doc(assetId);
  const assetDoc = await assetRef.get();

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

  await assetRef.delete();
  return { id: assetId, deleted: true };
}
