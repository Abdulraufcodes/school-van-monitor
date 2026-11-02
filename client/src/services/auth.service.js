import { api } from './api.js';

export async function login({ email, password }) {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data;
}

export async function activateAccount(payload) { return (await api.post('/auth/activate', payload)).data; }
export async function requestPasswordReset(email) { return (await api.post('/auth/password/reset-request', { email })).data; }
export async function resetPassword(payload) { return (await api.post('/auth/password/reset', payload)).data; }
export async function changePassword(payload) { return (await api.post('/auth/password/change', payload)).data; }

export function getLoginErrorMessage(error) {
  const status = error.response?.status;
  const apiMessage = error.response?.data?.message;

  if (status === 400) {
    return apiMessage || 'Check your email and password, then try again.';
  }
  if (status === 401) {
    return 'The email or password is incorrect, or this account is inactive.';
  }
  if (status === 403) {
    return apiMessage || 'This account is not authorized to access this resource.';
  }
  if (error.response) {
    return status >= 500
      ? 'The service is temporarily unavailable. Please try again shortly.'
      : apiMessage || 'Unable to sign in. Please try again.';
  }
  if (error.request) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return 'Unable to sign in. Please try again.';
}
