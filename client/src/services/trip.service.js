import { api } from './api.js';

export async function getAdminActiveTrips({ signal } = {}) {
  const response = await api.get('/trips/admin/locations', { signal });
  const trips = response.data?.data?.trips;
  if (!Array.isArray(trips)) {
    throw new Error('The server returned an unexpected active trips response.');
  }
  return trips;
}

export async function startTrip({ vanId, tripType }) {
  const response = await api.post('/trips/start', { vanId, tripType });
  const trip = response.data?.data;
  if (!trip || typeof trip !== 'object' || Array.isArray(trip)) {
    throw new Error('The server returned an unexpected started trip response.');
  }
  return trip;
}

export async function getActiveTrip() {
  const response = await api.get('/trips/active');
  const data = response.data?.data;
  if (!data || typeof data !== 'object' || !Object.hasOwn(data, 'trip')) {
    throw new Error('The server returned an unexpected active trip response.');
  }
  if (data.trip !== null && (typeof data.trip !== 'object' || Array.isArray(data.trip))) {
    throw new Error('The server returned an unexpected active trip response.');
  }
  return data.trip;
}

export async function endTrip(tripId) {
  const response = await api.post(`/trips/${encodeURIComponent(tripId)}/end`);
  const trip = response.data?.data;
  if (!trip || typeof trip !== 'object' || Array.isArray(trip)) {
    throw new Error('The server returned an unexpected completed trip response.');
  }
  return trip;
}
