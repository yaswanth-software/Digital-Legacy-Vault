import api from './api';

export async function getSecurityOverview() {
  const response = await api.get('/security/overview');
  return response.data;
}

export async function getSecurityEvents() {
  const response = await api.get('/security/events');
  return response.data;
}

export async function acknowledgeSecurityEvent(id) {
  const response = await api.post(`/security/events/${id}/acknowledge`);
  return response.data;
}

export async function getPrivacySummary() {
  const response = await api.get('/privacy/summary');
  return response.data;
}

export async function exportUserData() {
  const response = await api.post('/privacy/export');
  return response.data;
}

export async function deleteAccount(confirmationText) {
  const response = await api.post('/privacy/account/delete', { confirmationText });
  return response.data;
}
