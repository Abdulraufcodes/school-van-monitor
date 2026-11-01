import { api } from './api.js';

export async function getAssignedVans() {
  const response = await api.get('/drivers/me/vans');
  const vans = response.data?.data;
  if (!Array.isArray(vans)) {
    throw new Error('The server returned an unexpected assigned vans response.');
  }
  return vans;
}

export async function getDrivers() {
  const response = await api.get('/drivers');
  const drivers = response.data?.data;
  if (!Array.isArray(drivers)) {
    throw new Error('The server returned an unexpected drivers response.');
  }
  return drivers;
}
