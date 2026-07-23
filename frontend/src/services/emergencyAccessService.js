import api from './api';

export async function getAvailableAssets() {
  const response = await api.get('/emergency-access/available');
  return response.data;
}

export async function createEmergencyRequest(data) {
  const response = await api.post('/emergency-access/request', data);
  return response.data;
}

export async function getRequestsSubmittedBy() {
  const response = await api.get('/emergency-access/my-requests');
  return response.data;
}

export async function getIncomingRequests() {
  const response = await api.get('/emergency-access/incoming');
  return response.data;
}

export async function getRequestDetails(id) {
  const response = await api.get(`/emergency-access/${id}`);
  return response.data;
}

export async function approveRequest(id) {
  const response = await api.post(`/emergency-access/${id}/approve`);
  return response.data;
}

export async function denyRequest(id) {
  const response = await api.post(`/emergency-access/${id}/deny`);
  return response.data;
}

export async function requestVerification(id, level) {
  const response = await api.post(`/emergency-access/${id}/request-verification`, { level });
  return response.data;
}
