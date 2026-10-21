import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Authentication/session integration is intentionally not added yet.
// Add a single documented token strategy when the auth module is implemented.
