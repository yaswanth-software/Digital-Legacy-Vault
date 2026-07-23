import api from './api';

/**
 * Get or create the primary legacy vault for the current authenticated user.
 */
export async function getOrCreateVault() {
  const response = await api.get('/vault');
  return response.data;
}

/**
 * Update vault metadata (name, description).
 */
export async function updateVault(name, description) {
  const response = await api.patch('/vault', { name, description });
  return response.data;
}

/**
 * List assets in the vault with optional filters.
 * 
 * @param {object} filters - { category, status, priority, assetType, q }
 */
export async function getAssets(filters = {}) {
  const response = await api.get('/vault/assets', { params: filters });
  return response.data;
}

/**
 * Retrieve details for a single asset.
 */
export async function getAssetById(assetId) {
  const response = await api.get(`/vault/assets/${assetId}`);
  return response.data;
}

/**
 * Create a new asset in the vault.
 */
export async function createAsset(assetData) {
  const response = await api.post('/vault/assets', assetData);
  return response.data;
}

/**
 * Update an existing asset's metadata.
 */
export async function updateAsset(assetId, assetData) {
  const response = await api.patch(`/vault/assets/${assetId}`, assetData);
  return response.data;
}

/**
 * Soft delete/archive an asset.
 */
export async function archiveAsset(assetId) {
  const response = await api.patch(`/vault/assets/${assetId}/archive`);
  return response.data;
}

/**
 * Restore an archived asset back to active.
 */
export async function restoreAsset(assetId) {
  const response = await api.patch(`/vault/assets/${assetId}/restore`);
  return response.data;
}

/**
 * Permanently delete an asset.
 */
export async function deleteAsset(assetId) {
  const response = await api.delete(`/vault/assets/${assetId}`);
  return response.data;
}
