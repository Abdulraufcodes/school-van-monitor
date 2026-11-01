import { api } from './api.js';

export async function getAdminActiveTrips({ signal } = {}) {
  const response = await api.get('/trips/admin/locations', { signal });
  const trips = response.data?.data?.trips;
  if (!Array.isArray(trips)) {
    throw new Error('The server returned an unexpected active trips response.');
  }
  return trips;
}
