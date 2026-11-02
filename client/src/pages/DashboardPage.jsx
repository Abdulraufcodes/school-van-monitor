import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { getApiHealth, getDashboardSummary } from '../services/dashboard.service.js';

const initialSummary = { status: 'loading', data: null, error: '' };

function MetricCard({ label, value, status, error, emptyText }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    {status === 'loading' && <p className="mt-6 text-sm text-slate-500" role="status">Loading…</p>}
    {status === 'error' && <div className="mt-4"><p className="text-sm font-semibold text-slate-400">Unavailable</p><p className="mt-1 text-xs text-rose-700" role="alert">{error}</p></div>}
    {status === 'ready' && <><p className="mt-5 text-3xl font-semibold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{value === 0 ? emptyText : 'From current school data'}</p></>}
  </article>;
}

function ProgressCard({ label, value, description }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{description}</p></article>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState({ status: 'loading', message: '' });
  const [summary, setSummary] = useState(initialSummary);

  const loadHealth = useCallback(async () => {
    setHealth({ status: 'loading', message: '' });
    try {
      const response = await getApiHealth();
      if (response?.success && response.data?.status === 'ok') setHealth({ status: 'connected', message: 'API connected' });
      else setHealth({ status: 'error', message: 'The API returned an unexpected health response.' });
    } catch { setHealth({ status: 'error', message: 'Could not reach the API. Check that the server is running.' }); }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummary({ ...initialSummary, status: 'loading' });
    try { setSummary({ status: 'ready', data: await getDashboardSummary(), error: '' }); }
    catch { setSummary({ status: 'error', data: null, error: 'School dashboard totals could not be loaded.' }); }
  }, []);

  useEffect(() => {
    void loadHealth(); void loadSummary();
    const intervalId = window.setInterval(() => { if (document.visibilityState !== 'hidden') void loadSummary(); }, 15000);
    const refreshWhenVisible = () => { if (document.visibilityState !== 'hidden') void loadSummary(); };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => { window.clearInterval(intervalId); document.removeEventListener('visibilitychange', refreshWhenVisible); };
  }, [loadHealth, loadSummary]);
  const totals = summary.data?.totals;
  const progress = summary.data?.progress;

  return <DashboardLayout title="Overview">
    <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-medium text-cyan-700">Overview</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Good to see you, {user?.name?.split(' ')[0] || 'Admin'}</h1><p className="mt-2 text-sm text-slate-500">Here’s the current picture of your school transport.</p></div>
      <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 sm:self-auto"><span className={`h-2 w-2 rounded-full ${health.status === 'connected' ? 'bg-emerald-500' : health.status === 'error' ? 'bg-rose-500' : 'animate-pulse bg-amber-400'}`} />{health.status === 'connected' ? 'API connected' : health.status === 'error' ? 'API unavailable' : 'Checking API'}</div>
    </section>

    {health.status === 'error' && <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center"><p className="text-sm text-rose-800" role="alert">{health.message}</p><button type="button" onClick={() => void loadHealth()} className="self-start rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 sm:self-auto">Retry</button></div>}

    <div className="mb-3 flex justify-end"><button type="button" onClick={() => void loadSummary()} disabled={summary.status === 'loading'} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Refresh overview</button></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Transport overview">
      <MetricCard label="Total vans" value={totals?.vans} status={summary.status} error={summary.error} emptyText="No vans registered" />
      <MetricCard label="Active drivers" value={totals?.activeDrivers} status={summary.status} error={summary.error} emptyText="No active drivers" />
      <MetricCard label="Active trips" value={totals?.activeTrips} status={summary.status} error={summary.error} emptyText="No active trips" />
      <MetricCard label="Active students" value={totals?.students} status={summary.status} error={summary.error} emptyText="No active students" />
    </section>

    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6" aria-label="Student trip progress">
      <div className="mb-4"><h2 className="font-semibold">Active trip student progress</h2><p className="mt-1 text-sm text-slate-500">Counts reflect students assigned to currently active trips in your school.</p></div>
      {summary.status === 'loading' && <p className="text-sm text-slate-500" role="status">Loading trip progress…</p>}
      {summary.status === 'error' && <p className="text-sm text-rose-700" role="alert">{summary.error}</p>}
      {summary.status === 'ready' && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><ProgressCard label="Assigned" value={progress.assigned} description="Across active trips"/><ProgressCard label="Picked up" value={progress.pickedUp} description="Verified morning pickups"/><ProgressCard label="Awaiting pickup" value={progress.pendingPickup} description="On active trip rosters"/><ProgressCard label="Dropped off" value={progress.droppedOff} description="Verified afternoon drop-offs"/><ProgressCard label="Awaiting drop-off" value={progress.pendingDropoff} description="Picked up and not yet dropped off"/></div>}
    </section>

    {summary.status === 'ready' && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6"><h2 className="font-semibold">Active trip breakdown</h2>{summary.data.trips.length === 0 ? <p className="mt-3 text-sm text-slate-500">No active trips to report.</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{summary.data.trips.map((item) => <article key={item.trip.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-slate-900">{item.van?.registrationNumber || 'Van details unavailable'}</h3><p className="mt-1 text-sm text-slate-600">{item.driver?.name || 'Driver details unavailable'} · {item.trip.tripType === 'morning_pickup' ? 'Morning pickup' : 'Afternoon drop-off'}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-800">{item.trip.status}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4"><div><dt className="text-xs text-slate-500">Assigned</dt><dd className="mt-1 font-semibold">{item.progress.assigned}</dd></div><div><dt className="text-xs text-slate-500">Picked up</dt><dd className="mt-1 font-semibold">{item.progress.pickedUp}</dd></div><div><dt className="text-xs text-slate-500">Awaiting pickup</dt><dd className="mt-1 font-semibold">{item.progress.pendingPickup}</dd></div><div><dt className="text-xs text-slate-500">Dropped off</dt><dd className="mt-1 font-semibold">{item.progress.droppedOff}</dd></div></dl></article>)}</div>}</section>}

    <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Recent activity</h2><p className="mt-1 text-sm text-slate-500">Latest transport updates for your school</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-500">Not connected</span></div><div className="mt-6 grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 px-5 text-center"><div><p className="text-sm font-medium text-slate-700">Activity feed unavailable</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">There is no school-wide admin activity endpoint. No sample activity is shown.</p></div></div></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6"><h2 className="font-semibold">System status</h2><p className="mt-1 text-sm text-slate-500">Live status from the health endpoint</p><div className="mt-5 rounded-xl bg-slate-50 p-4">{health.status === 'loading' && <p className="text-sm text-slate-500" role="status">Checking the API…</p>}{health.status === 'connected' && <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">✓</span><div><p className="text-sm font-medium text-slate-800">API responding</p><p className="text-xs text-slate-500">{health.message}</p></div></div>}{health.status === 'error' && <p className="text-sm text-rose-700" role="alert">{health.message}</p>}</div>{health.status !== 'connected' && <button type="button" onClick={() => void loadHealth()} disabled={health.status === 'loading'} className="mt-4 text-sm font-semibold text-cyan-800 hover:text-cyan-950 disabled:opacity-50">{health.status === 'loading' ? 'Checking…' : 'Retry connection'}</button>}</article>
    </section>
    <nav className="mt-8 flex flex-wrap gap-3" aria-label="Admin shortcuts"><Link to="/dashboard/vans" className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">Manage vans</Link><Link to="/dashboard/people" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Manage school people</Link><Link to="/dashboard/live-tracking" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Live tracking</Link></nav>
  </DashboardLayout>;
}
