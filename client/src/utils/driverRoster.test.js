import test from 'node:test';
import assert from 'node:assert/strict';
import { applyVerifiedEvent, getStudentEventError, sortRosterStudents } from './driverRoster.js';

const students = [
  { studentId: '3', name: 'Zara', pickupStatus: 'picked_up', dropoffStatus: 'pending' },
  { studentId: '2', name: 'Bea', pickupStatus: 'pending', dropoffStatus: 'pending' },
  { studentId: '1', name: 'Ari', pickupStatus: 'picked_up', dropoffStatus: 'dropped_off' }
];

test('morning roster sorts pending pickups first and completed pickups below', () => {
  assert.deepEqual(sortRosterStudents(students, 'morning_pickup').map(({ studentId }) => studentId), ['2', '1', '3']);
});

test('afternoon roster includes only verified morning pickups and sorts pending drop-offs first', () => {
  const roster = sortRosterStudents(students, 'afternoon_dropoff');
  assert.deepEqual(roster.map(({ studentId }) => studentId), ['3', '1']);
  assert.equal(roster[0].dropoffStatus, 'pending');
  assert.equal(roster[1].dropoffStatus, 'dropped_off');
});

test('roster changes to completed only from a successful server event', () => {
  const event = { studentId: '2', type: 'picked_up', occurredAt: '2026-10-01T08:00:00.000Z' };
  const next = applyVerifiedEvent(students, event);
  assert.equal(next[1].pickupStatus, 'picked_up');
  assert.equal(next[1].pickupTime, event.occurredAt);
  assert.equal(students[1].pickupStatus, 'pending');
});

test('OTP errors map expiry, invalid code, resend cooldown, and network failures', () => {
  assert.match(getStudentEventError({ response: { data: { code: 'OTP_EXPIRED' } } }), /expired/i);
  assert.match(getStudentEventError({ response: { data: { code: 'OTP_INVALID' } } }), /incorrect/i);
  assert.match(getStudentEventError({ response: { data: { code: 'OTP_RESEND_COOLDOWN' } } }), /resend timer/i);
  assert.match(getStudentEventError({ request: {} }), /Could not reach the server/);
});
