import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Keep the current token in memory as the request interceptor's source of truth.
let accessToken = null;
let authFailureHandler = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function setAuthFailureHandler(handler) {
  authFailureHandler = handler;
}

api.interceptors.request.use((config) => {
  const isLoginRequest = config.url?.replace(/^\//, '') === 'auth/login';
  if (accessToken && !isLoginRequest) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.replace(/^\//, '') === 'auth/login';
    if (error.response?.status === 401 && !isLoginRequest && error.config?.headers?.Authorization) {
      setAccessToken(null);
      authFailureHandler?.();
    }
    return Promise.reject(error);
  }
);
