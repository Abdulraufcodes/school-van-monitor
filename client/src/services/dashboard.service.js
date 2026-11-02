import { api } from './api.js';

export async function getApiHealth() {
  const response = await api.get('/health');
  return response.data;
}

export async function getDashboardSummary() {
  const response = await api.get('/dashboard/summary');
  const summary = response.data?.data;
  if (!summary?.totals || !summary?.progress || !Array.isArray(summary.trips)) {
    throw new Error('The server returned an unexpected dashboard summary response.');
  }
  return summary;
}
