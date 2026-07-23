import api from './api';

/**
 * Retrieve list of trusted people.
 */
export async function getTrustedPeople(params = {}) {
  const response = await api.get('/trusted-people', { params });
  return response.data;
}

/**
 * Create a new trusted person and trigger invitation.
 */
export async function createTrustedPerson(data) {
  const response = await api.post('/trusted-people', data);
  return response.data;
}

/**
 * Fetch details of a single trusted person.
 */
export async function getTrustedPersonById(id) {
  const response = await api.get(`/trusted-people/${id}`);
  return response.data;
}

/**
 * Update trusted person information.
 */
export async function updateTrustedPerson(id, data) {
  const response = await api.patch(`/trusted-people/${id}`, data);
  return response.data;
}

/**
 * Soft remove a trusted person.
 */
export async function deleteTrustedPerson(id) {
  const response = await api.delete(`/trusted-people/${id}`);
  return response.data;
}

/**
 * Resend invitation with new token and refreshed expiry.
 */
export async function resendInvitation(id) {
  const response = await api.post(`/trusted-people/${id}/resend-invitation`);
  return response.data;
}

/**
 * Revoke trust relationship and delete permissions.
 */
export async function revokeTrustedPerson(id) {
  const response = await api.post(`/trusted-people/${id}/revoke`);
  return response.data;
}

/**
 * List permissions configured for a trusted person.
 */
export async function getPermissions(trustedPersonId) {
  const response = await api.get(`/trusted-people/${trustedPersonId}/access`);
  return response.data;
}

/**
 * Create or configure permission for a specific asset.
 */
export async function configurePermission(trustedPersonId, data) {
  const response = await api.post(`/trusted-people/${trustedPersonId}/access`, data);
  return response.data;
}

/**
 * Public preview of invitation details.
 */
export async function previewInvitation(token, vaultId, id) {
  const response = await api.get('/invitations/preview', { params: { token, vaultId, id } });
  return response.data;
}

/**
 * Authenticated acceptance of invitation.
 */
export async function acceptInvitation(token, vaultId, id) {
  const response = await api.post('/invitations/accept', { token, vaultId, id });
  return response.data;
}
