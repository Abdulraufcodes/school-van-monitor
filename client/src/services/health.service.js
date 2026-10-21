import { api } from './api.js';

export async function getHealth() {
  const response = await api.get('/health');
  return response.data;
}
