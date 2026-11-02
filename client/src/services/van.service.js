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

export async function updateVanDriver(vanId, assignedDriver) {
  const response = await api.patch(`/vans/${encodeURIComponent(vanId)}/driver`, { assignedDriver });
  return response.data?.data;
}

export async function updateVanLocation(vanId, { latitude, longitude, recordedAt }) {
  const response = await api.post(`/vans/${encodeURIComponent(vanId)}/location`, {
    latitude,
    longitude,
    recordedAt
  });
  const location = response.data?.data;
  if (!location || typeof location !== 'object' || Array.isArray(location)
    || !location.vanId || !location.tripId
    || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)
    || !location.recordedAt || !location.receivedAt) {
    throw new Error('The server returned an unexpected location response.');
  }
  return location;
}
