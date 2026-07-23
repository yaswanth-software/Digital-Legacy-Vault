import api from './api';

export async function getActivityLogs(params = {}) {
  const response = await api.get('/activity', { params });
  return response.data;
}
