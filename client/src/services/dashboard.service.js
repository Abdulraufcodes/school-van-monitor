import { api } from './api.js';

export async function getApiHealth() {
  const response = await api.get('/health');
  return response.data;
}
