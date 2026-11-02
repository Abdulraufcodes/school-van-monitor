import { api } from './api.js';

function getData(response, expectedShape, message) {
  const data = response.data?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data) || !expectedShape(data)) {
    throw new Error(message);
  }
  return data;
}

export async function getTripStudentStatuses(tripId) {
  const response = await api.get(`/student-events/${encodeURIComponent(tripId)}/students`);
  return getData(response, (data) => Array.isArray(data.students), 'The server returned an unexpected student roster response.');
}

export async function getStudentTripStatus(tripId, studentId) {
  const response = await api.get(`/student-events/${encodeURIComponent(tripId)}/students/${encodeURIComponent(studentId)}/status`);
  return getData(response, (data) => data.student && data.pickup && data.dropoff, 'The server returned an unexpected student status response.');
}

export async function getAdminStudentEventHistory(studentId, { page = 1, limit = 20 } = {}) {
  const response = await api.get(
    `/student-events/admin/students/${encodeURIComponent(studentId)}/history`,
    { params: { page, limit } }
  );
  return getData(
    response,
    (data) => data.student && Array.isArray(data.events)
      && data.pagination && Number.isInteger(data.pagination.page)
      && Number.isInteger(data.pagination.limit) && Number.isInteger(data.pagination.total)
      && Number.isInteger(data.pagination.totalPages),
    'The server returned an unexpected student history response.'
  );
}

export async function getParentStudentEventHistory(studentId, { page = 1, limit = 20 } = {}) {
  const response = await api.get(
    `/student-events/students/${encodeURIComponent(studentId)}/history`,
    { params: { page, limit } }
  );
  return getData(
    response,
    (data) => data.student && Array.isArray(data.events)
      && data.pagination && Number.isInteger(data.pagination.page)
      && Number.isInteger(data.pagination.limit) && Number.isInteger(data.pagination.total)
      && Number.isInteger(data.pagination.totalPages),
    'The server returned an unexpected student history response.'
  );
}

export async function requestPickupOtp(tripId, studentId) {
  const response = await api.post(`/student-events/${encodeURIComponent(tripId)}/students/${encodeURIComponent(studentId)}/pickup/otp`, {});
  return getData(response, (data) => data.studentId && Number.isFinite(data.expiresInSeconds) && Number.isFinite(data.resendAvailableInSeconds), 'The server returned an unexpected pickup OTP response.');
}

export async function verifyPickupOtp(tripId, studentId, otp) {
  const response = await api.post(`/student-events/${encodeURIComponent(tripId)}/students/${encodeURIComponent(studentId)}/pickup/verify`, { otp });
  return getData(response, (data) => data.studentId && data.tripId && data.type === 'picked_up' && data.occurredAt, 'The server returned an unexpected pickup verification response.');
}

export async function requestDropoffOtp(tripId, studentId) {
  const response = await api.post(`/student-events/${encodeURIComponent(tripId)}/students/${encodeURIComponent(studentId)}/dropoff/otp`, {});
  return getData(response, (data) => data.studentId && Number.isFinite(data.expiresInSeconds) && Number.isFinite(data.resendAvailableInSeconds), 'The server returned an unexpected drop-off OTP response.');
}

export async function verifyDropoffOtp(tripId, studentId, otp) {
  const response = await api.post(`/student-events/${encodeURIComponent(tripId)}/students/${encodeURIComponent(studentId)}/dropoff/verify`, { otp });
  return getData(response, (data) => data.studentId && data.tripId && data.type === 'dropped_off' && data.occurredAt, 'The server returned an unexpected drop-off verification response.');
}
