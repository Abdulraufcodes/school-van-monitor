import { useCallback, useRef, useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { getAdminStudentEventHistory } from '../services/studentEvent.service.js';
import { formatAuditTimestamp, getAuditEventLabel, getAuditHistoryViewState, isStudentObjectId } from '../utils/studentAuditHistory.js';

const PAGE_SIZE = 20;

function getHistoryError(error) {
  return error.response?.data?.message || (error.request
    ? 'Could not reach the server. Check your connection and try again.'
    : 'Student activity could not be loaded.');
}

function IdValue({ label, value }) {
  return <div className="min-w-0"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700">{value || 'Unavailable'}</dd></div>;
}

function EventCard({ event }) {
  const isPickup = event.type === 'picked_up';
  const eventLabel = getAuditEventLabel(event.type);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{event.type || 'Event type unavailable'}</p><h3 className="mt-1 text-base font-semibold text-slate-950">{eventLabel}</h3></div>
        <time className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isPickup ? 'bg-cyan-50 text-cyan-900' : event.type === 'dropped_off' ? 'bg-violet-50 text-violet-900' : 'bg-slate-100 text-slate-700'}`} dateTime={event.occurredAt || undefined}>{formatAuditTimestamp(event.occurredAt)}</time>
      </div>
      <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        <IdValue label="Event ID" value={event.id}/>
        <IdValue label="Trip ID" value={event.tripId}/>
        <IdValue label="Van ID" value={event.vanId}/>
        <IdValue label="Driver ID" value={event.driverId}/>
      </dl>
    </article>
  );
}

export function StudentActivityPage() {
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentId, setStudentId] = useState('');
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputError, setInputError] = useState('');
  const requestId = useRef(0);
  const viewState = getAuditHistoryViewState({ studentId, loading, error, history });

  const loadHistory = useCallback(async (requestedStudentId, requestedPage) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const result = await getAdminStudentEventHistory(requestedStudentId, { page: requestedPage, limit: PAGE_SIZE });
      if (currentRequest === requestId.current) setHistory(result);
    } catch (caught) {
      if (currentRequest === requestId.current) {
        setHistory(null);
        setError(getHistoryError(caught));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedId = studentIdInput.trim();
    if (!isStudentObjectId(normalizedId)) {
      setInputError('Enter a valid 24-character student ID.');
      return;
    }
    setInputError('');
    setStudentId(normalizedId);
    setPage(1);
    setHistory(null);
    void loadHistory(normalizedId, 1);
  }

  function changePage(nextPage) {
    if (!studentId || loading || nextPage < 1 || nextPage > (history?.pagination?.totalPages ?? 0)) return;
    setPage(nextPage);
    void loadHistory(studentId, nextPage);
  }

  return (
    <DashboardLayout title="Student Activity">
      <header className="mb-6">
        <p className="text-sm font-medium text-cyan-700">Read-only audit</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Student Activity &amp; Audit History</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Review pickup and drop-off events for a student. The current API requires a student ID; there is no school-wide student directory endpoint.</p>
      </header>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="student-history-id" className="block text-sm font-semibold text-slate-800">Student ID</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input id="student-history-id" value={studentIdInput} onChange={(event) => setStudentIdInput(event.target.value)} placeholder="24-character student ID" autoComplete="off" aria-invalid={Boolean(inputError)} aria-describedby={inputError ? 'student-id-error' : 'student-id-help'} className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15" />
          <button type="submit" disabled={loading} className="min-h-11 rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:opacity-50">{loading ? 'Loading…' : 'View activity'}</button>
        </div>
        <p id={inputError ? 'student-id-error' : 'student-id-help'} className={`mt-2 text-xs ${inputError ? 'text-rose-700' : 'text-slate-500'}`} role={inputError ? 'alert' : undefined}>{inputError || 'Use the student ID from your school records.'}</p>
      </form>

      {studentId && <section className="mt-6" aria-labelledby="activity-results-heading" aria-busy={loading}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm text-slate-500">Student: {history?.student?.name || 'Name unavailable'} · ID {history?.student?.id || studentId}</p><h2 id="activity-results-heading" className="mt-1 text-xl font-semibold text-slate-950">Audit records</h2></div>
          <button type="button" onClick={() => void loadHistory(studentId, page)} disabled={loading} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>

        {viewState === 'loading' && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600" role="status">Loading student activity…</p>}
        {viewState === 'error' && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm text-rose-800" role="alert">{error}</p><button type="button" onClick={() => void loadHistory(studentId, page)} disabled={loading} className="mt-3 min-h-10 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50">Retry</button></div>}
        {viewState === 'empty' && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">No pickup or drop-off events were found for this student.</p>}
        {history?.events.length > 0 && <>
          <p className="mb-3 text-xs text-slate-500">Trip type is not included in the API response; event labels reflect the backend’s pickup and drop-off workflow.</p>
          <div className="space-y-3">{history.events.map((event) => <EventCard key={event.id} event={event}/>)}</div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm text-slate-600">Page {history.pagination.page} of {history.pagination.totalPages} · {history.pagination.total} total events</p>
            <div className="flex gap-2"><button type="button" onClick={() => changePage(page - 1)} disabled={loading || page <= 1} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button><button type="button" onClick={() => changePage(page + 1)} disabled={loading || page >= history.pagination.totalPages} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button></div>
          </div>
        </>}
      </section>}
    </DashboardLayout>
  );
}
