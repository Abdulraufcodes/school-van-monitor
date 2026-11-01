export function isStudentObjectId(value) {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value.trim());
}

export function getAuditEventLabel(type) {
  if (type === 'picked_up') return 'Morning pickup';
  if (type === 'dropped_off') return 'Afternoon drop-off';
  return 'Unknown event type';
}

export function formatAuditTimestamp(value) {
  if (!value) return 'Timestamp unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Timestamp unavailable';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function getAuditHistoryViewState({ studentId, loading, error, history }) {
  if (!studentId) return 'idle';
  if (loading && !history) return 'loading';
  if (error) return 'error';
  if (!history) return 'idle';
  return history.events.length ? 'ready' : 'empty';
}
