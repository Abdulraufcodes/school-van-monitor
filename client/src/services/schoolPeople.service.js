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
