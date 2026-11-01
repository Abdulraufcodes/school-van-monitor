import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAuditTimestamp, getAuditEventLabel, getAuditHistoryViewState, isStudentObjectId } from './studentAuditHistory.js';

test('student history accepts only a Mongo ObjectId string', () => {
  assert.equal(isStudentObjectId('507f1f77bcf86cd799439011'), true);
  assert.equal(isStudentObjectId(' 507F1F77BCF86CD799439011 '), true);
  assert.equal(isStudentObjectId('student-1'), false);
  assert.equal(isStudentObjectId(''), false);
});

test('event types distinguish morning pickup and afternoon drop-off', () => {
  assert.equal(getAuditEventLabel('picked_up'), 'Morning pickup');
  assert.equal(getAuditEventLabel('dropped_off'), 'Afternoon drop-off');
  assert.equal(getAuditEventLabel('other'), 'Unknown event type');
});

test('audit timestamp formatting handles missing, invalid, and valid values', () => {
  assert.equal(formatAuditTimestamp(null), 'Timestamp unavailable');
  assert.equal(formatAuditTimestamp('invalid'), 'Timestamp unavailable');
  assert.notEqual(formatAuditTimestamp('2026-11-01T08:00:00.000Z'), 'Timestamp unavailable');
});

test('audit history state covers idle, loading, error, empty, and populated results', () => {
  assert.equal(getAuditHistoryViewState({ studentId: '', loading: false, error: '', history: null }), 'idle');
  assert.equal(getAuditHistoryViewState({ studentId: 'id', loading: true, error: '', history: null }), 'loading');
  assert.equal(getAuditHistoryViewState({ studentId: 'id', loading: false, error: 'failed', history: null }), 'error');
  assert.equal(getAuditHistoryViewState({ studentId: 'id', loading: false, error: '', history: { events: [] } }), 'empty');
  assert.equal(getAuditHistoryViewState({ studentId: 'id', loading: false, error: '', history: { events: [{ id: 'event' }] } }), 'ready');
});
