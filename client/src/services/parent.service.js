import { api } from './api.js';

export async function getParentStudents() {
  const response = await api.get('/parents/me/students');
  const students = response.data?.data;
  if (!Array.isArray(students)) throw new Error('The server returned an unexpected linked students response.');
  return students;
}
