import api from './api';

/**
 * Retrieve the list of files linked to a specific asset.
 */
export async function getAssetFiles(assetId) {
  const response = await api.get(`/vault/assets/${assetId}/files`);
  return response.data;
}

/**
 * Upload multiple files to a specific asset.
 * Accepts a FormData payload with a key named "files".
 */
export async function uploadAssetFiles(assetId, formData, onUploadProgress) {
  const response = await api.post(`/vault/assets/${assetId}/files`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return response.data;
}

/**
 * Request a temporary secure signed download URL for a file.
 */
export async function downloadAssetFile(assetId, fileId) {
  const response = await api.get(`/vault/assets/${assetId}/files/${fileId}/download`);
  return response.data;
}

/**
 * Permanently delete a file attachment from an asset.
 */
export async function deleteAssetFile(assetId, fileId) {
  const response = await api.delete(`/vault/assets/${assetId}/files/${fileId}`);
  return response.data;
}
