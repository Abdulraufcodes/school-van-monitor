import { api } from './api.js';

export async function getPickupAlertSettings() {
  const response = await api.get('/admin/settings/pickup-alerts');
  return response.data?.data;
}

export async function savePickupAlertSettings(settings) {
  const response = await api.put('/admin/settings/pickup-alerts', settings);
  return response.data?.data;
}
