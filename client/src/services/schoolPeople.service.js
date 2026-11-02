import { api } from './api.js';

export async function getSchoolPeople() {
  const response = await api.get('/admin/people');
  return response.data?.data;
}

export async function createSchoolUser(payload) {
  const response = await api.post('/admin/users', payload);
  return response.data?.data;
}

export async function createSchoolStudent(payload) {
  const response = await api.post('/admin/students', payload);
  return response.data?.data;
}

export async function downloadRegistrationTemplate() {
  const response = await api.get('/admin/import/template', { responseType: 'blob' });
  return response.data;
}

export async function previewRegistrationFile(file) {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post('/admin/import/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data?.data;
}

export async function commitRegistrationFile(file) {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post('/admin/import/commit', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data?.data;
}
