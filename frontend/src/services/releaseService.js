import api from './api';

export async function getReleases(type = 'recipient') {
  const response = await api.get('/releases', { params: { type } });
  return response.data;
}

export async function getReleaseDetails(id) {
  const response = await api.get(`/releases/${id}`);
  return response.data;
}

export async function getReleaseAssets(id) {
  const response = await api.get(`/releases/${id}/assets`);
  return response.data;
}

export async function getReleaseAssetDetails(releaseId, assetId) {
  const response = await api.get(`/releases/${releaseId}/assets/${assetId}`);
  return response.data;
}

export async function revokeRelease(id, reason) {
  const response = await api.post(`/releases/${id}/revoke`, { reason });
  return response.data;
}

export async function getReleaseActivityLogs(id) {
  const response = await api.get(`/releases/${id}/activity`);
  return response.data;
}

export async function getSecureFileAccess(releaseId, assetId, fileId, action = 'view') {
  const response = await api.get(`/releases/${releaseId}/assets/${assetId}/files/${fileId}/access`, {
    params: { action }
  });
  return response.data;
}

export async function triggerManualExpireCheck() {
  const response = await api.post('/releases/expire-check');
  return response.data;
}
