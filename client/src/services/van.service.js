import { api } from './api.js';

export async function getVans() {
  const response = await api.get('/vans');
  const vans = response.data?.data;
  if (!Array.isArray(vans)) {
    throw new Error('The server returned an unexpected vans response.');
  }
  return vans;
}

export async function createVan(payload) {
  const response = await api.post('/vans', {
    registrationNumber: payload.registrationNumber,
    assignedDriver: payload.assignedDriver
  });
  return response.data?.data;
}
