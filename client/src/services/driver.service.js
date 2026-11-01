import { api } from './api.js';

export async function getDrivers() {
  const response = await api.get('/drivers');
  const drivers = response.data?.data;
  if (!Array.isArray(drivers)) {
    throw new Error('The server returned an unexpected drivers response.');
  }
  return drivers;
}
