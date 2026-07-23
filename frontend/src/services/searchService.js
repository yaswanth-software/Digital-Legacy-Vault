import api from './api';

export async function searchVault(query) {
  const response = await api.get('/search', { params: { q: query } });
  return response.data;
}
