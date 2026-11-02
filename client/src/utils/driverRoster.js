export function sortRosterStudents(students, tripType) {
  if (!Array.isArray(students) || !['morning_pickup', 'afternoon_dropoff'].includes(tripType)) return [];

  const eligible = tripType === 'afternoon_dropoff'
    ? students.filter((student) => student.pickupStatus === 'picked_up')
    : students;
  const isComplete = tripType === 'morning_pickup'
    ? (student) => student.pickupStatus === 'picked_up'
    : (student) => student.dropoffStatus === 'dropped_off';

  return [...eligible].sort((a, b) => {
    const statusOrder = Number(isComplete(a)) - Number(isComplete(b));
    return statusOrder || String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export function applyVerifiedEvent(students, event) {
  return students.map((student) => {
    if (String(student.studentId) !== String(event.studentId)) return student;
    if (event.type === 'picked_up') {
      return { ...student, pickupStatus: 'picked_up', pickupTime: event.occurredAt };
    }
    if (event.type === 'dropped_off') {
      return { ...student, dropoffStatus: 'dropped_off', dropoffTime: event.occurredAt };
    }
    return student;
  });
}

export function getStudentEventError(error) {
  const code = error.response?.data?.code;
  if (code === 'OTP_EXPIRED') return 'This code has expired. Request a new code when available.';
  if (code === 'OTP_INVALID') return 'That code is incorrect or no longer valid. Check it and try again.';
  if (code === 'OTP_RESEND_COOLDOWN') return 'A code was sent recently. Wait for the resend timer before requesting another.';
  if (code === 'OTP_ATTEMPTS_EXCEEDED') return 'Too many incorrect attempts. Request a new code when available.';
  if (code === 'STUDENT_NOT_PICKED_UP') return 'A verified morning pickup is required before drop-off.';
  return error.response?.data?.message
    || (error.request ? 'Could not reach the server. Check your connection and try again.' : 'The student action could not be completed.');
}
