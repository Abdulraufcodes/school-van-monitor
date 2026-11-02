import { api } from './api.js';

export async function getParentNotifications() {
  const response = await api.get('/notifications');
  const notifications = response.data?.data;
  if (!Array.isArray(notifications)) throw new Error('The server returned an unexpected notifications response.');
  return notifications;
}
