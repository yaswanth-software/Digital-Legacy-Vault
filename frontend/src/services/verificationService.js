import api from './api';

export async function getVerificationDetails(id) {
  const response = await api.get(`/verifications/${id}`);
  return response.data;
}

export async function startVerification(id) {
  const response = await api.post(`/verifications/${id}/start`);
  return response.data;
}

export async function completeVerificationStep(id, stepName) {
  const response = await api.post(`/verifications/${id}/complete`, { stepName });
  return response.data;
}

export async function cancelVerification(id) {
  const response = await api.post(`/verifications/${id}/cancel`);
  return response.data;
}
