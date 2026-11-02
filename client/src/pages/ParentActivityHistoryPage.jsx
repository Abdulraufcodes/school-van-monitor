import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { getParentStudents } from '../services/parent.service.js';
import { getParentStudentEventHistory } from '../services/studentEvent.service.js';
import { formatAuditTimestamp, getAuditEventLabel } from '../utils/studentAuditHistory.js';

const PAGE_SIZE = 20;

function eventStyle(type) {
  return type === 'picked_up' ? 'bg-cyan-50 text-cyan-900' : type === 'dropped_off' ? 'bg-violet-50 text-violet-900' : 'bg-slate-100 text-slate-700';
}

export function ParentActivityHistoryPage() {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStudents = useCallback(async () => {
    try {
      const records = await getParentStudents();
      setStudents(records);
      setStudentId((current) => current && records.some((item) => item.student.id === current) ? current : records[0]?.student.id || '');
    } catch (cause) { setError(cause.response?.data?.message || 'Linked students could not be loaded.'); setLoading(false); }
  }, []);

  useEffect(() => { void loadStudents(); }, [loadStudents]);
  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!studentId) { setHistory(null); setLoading(false); return; }
      setLoading(true); setError('');
      try { const nextHistory = await getParentStudentEventHistory(studentId, { page: 1, limit: PAGE_SIZE }); if (!cancelled) { setHistory(nextHistory); setPage(1); } }
      catch (cause) { if (!cancelled) setError(cause.response?.data?.message || 'Student activity could not be loaded.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void loadHistory();
    return () => { cancelled = true; };
  }, [studentId]);

  async function changePage(nextPage) {
    if (!studentId || nextPage < 1 || nextPage > (history?.pagination.totalPages || 1)) return;
    setLoading(true); setError('');
    try { setHistory(await getParentStudentEventHistory(studentId, { page: nextPage, limit: PAGE_SIZE })); setPage(nextPage); }
    catch (cause) { setError(cause.response?.data?.message || 'The next page could not be loaded.'); }
    finally { setLoading(false); }
  }

  return <DashboardLayout title="Activity history">
    <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-cyan-700">Family workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Pickup and drop-off history</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Review verified student events recorded by the school van driver.</p></div><Link to="/parent/live-tracking" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">View live tracking</Link></section>
    {students.length > 0 && <label className="mb-5 block max-w-md text-sm font-medium text-slate-700">Choose a child<select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-600/15">{students.map((item) => <option key={item.student.id} value={item.student.id}>{item.student.name}{item.student.className ? ` · ${item.student.className}` : ''}</option>)}</select></label>}
    {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}<button type="button" onClick={() => studentId ? void changePage(page) : void loadStudents()} className="ml-2 font-semibold underline">Retry</button></div>}
    <section aria-live="polite">
      {loading && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">Loading activity…</p>}
      {!loading && !error && students.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="font-semibold text-slate-900">No linked students yet</h2><p className="mt-2 text-sm text-slate-600">Ask your school to link your parent account to a student.</p></div>}
      {!loading && !error && history && history.events.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="font-semibold text-slate-900">No activity recorded yet</h2><p className="mt-2 text-sm text-slate-600">Verified pickup and drop-off events for {history.student.name} will appear here.</p></div>}
      {!loading && !error && history?.events.length > 0 && <><div className="mb-3 flex flex-wrap justify-between gap-2 text-sm text-slate-600"><p>{history.student.name} · {history.pagination.total} recorded events</p><p>Page {page} of {history.pagination.totalPages}</p></div><div className="space-y-3">{history.events.map((event) => <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eventStyle(event.type)}`}>{getAuditEventLabel(event.type)}</span><p className="mt-2 text-sm text-slate-700">{event.type === 'picked_up' ? 'Student boarded the van.' : 'Student left the van.'}</p>{event.vanRegistrationNumber && <p className="mt-1 text-xs text-slate-500">Van {event.vanRegistrationNumber}</p>}</div><time className="text-sm font-medium text-slate-700" dateTime={event.occurredAt || undefined}>{formatAuditTimestamp(event.occurredAt)}</time></div></article>)}</div><div className="mt-5 flex items-center justify-between"><button type="button" disabled={page <= 1 || loading} onClick={() => void changePage(page - 1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40">Previous</button><button type="button" disabled={page >= history.pagination.totalPages || loading} onClick={() => void changePage(page + 1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40">Next</button></div></>}
    </section>
  </DashboardLayout>;
}
