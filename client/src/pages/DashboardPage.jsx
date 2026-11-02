import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { getApiHealth } from '../services/dashboard.service.js';
import { getDrivers } from '../services/driver.service.js';
import { getAdminActiveTrips } from '../services/trip.service.js';
import { getVans } from '../services/van.service.js';

const initialMetric = { status: 'loading', value: null, error: '' };
const initialMetrics = { vans: initialMetric, drivers: initialMetric, trips: initialMetric };

function MetricCard({ label, metric, emptyText }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {metric.status === 'loading' && <p className="mt-6 text-sm text-slate-500" role="status">Loading…</p>}
      {metric.status === 'error' && <div className="mt-4"><p className="text-sm font-semibold text-slate-400">Unavailable</p><p className="mt-1 text-xs text-rose-700" role="alert">{metric.error}</p></div>}
      {metric.status === 'ready' && <><p className="mt-5 text-3xl font-semibold text-slate-950">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.value === 0 ? emptyText : 'From current school data'}</p></>}
    </article>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState({ status: 'loading', message: '' });
  const [metrics, setMetrics] = useState(initialMetrics);

  const loadHealth = useCallback(async () => {
    setHealth({ status: 'loading', message: '' });
    try {
      const response = await getApiHealth();
      if (response?.success && response.data?.status === 'ok') {
        setHealth({ status: 'connected', message: 'API connected' });
      } else {
        setHealth({ status: 'error', message: 'The API returned an unexpected health response.' });
      }
    } catch {
      setHealth({ status: 'error', message: 'Could not reach the API. Check that the server is running.' });
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setMetrics({ vans: initialMetric, drivers: initialMetric, trips: initialMetric });
    const [vansResult, driversResult, tripsResult] = await Promise.allSettled([
      getVans(), getDrivers(), getAdminActiveTrips()
    ]);
    setMetrics({
      vans: vansResult.status === 'fulfilled'
        ? { status: 'ready', value: vansResult.value.length, error: '' }
        : { status: 'error', value: null, error: 'Van totals could not be loaded.' },
      drivers: driversResult.status === 'fulfilled'
        ? { status: 'ready', value: driversResult.value.length, error: '' }
        : { status: 'error', value: null, error: 'Active driver totals could not be loaded.' },
      trips: tripsResult.status === 'fulfilled'
        ? { status: 'ready', value: tripsResult.value.length, error: '' }
        : { status: 'error', value: null, error: 'Active trip totals could not be loaded.' }
    });
  }, []);

  useEffect(() => { void loadHealth(); void loadMetrics(); }, [loadHealth, loadMetrics]);

  return (
    <DashboardLayout title="Overview">
      <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-cyan-700">Overview</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Good to see you, {user?.name?.split(' ')[0] || 'Admin'}</h1><p className="mt-2 text-sm text-slate-500">Here’s the current picture of your school transport.</p></div>
        <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 sm:self-auto">
          <span className={`h-2 w-2 rounded-full ${health.status === 'connected' ? 'bg-emerald-500' : health.status === 'error' ? 'bg-rose-500' : 'animate-pulse bg-amber-400'}`} />
          {health.status === 'connected' ? 'API connected' : health.status === 'error' ? 'API unavailable' : 'Checking API'}
        </div>
      </section>

      {health.status === 'error' && <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center"><p className="text-sm text-rose-800" role="alert">{health.message}</p><button type="button" onClick={() => void loadHealth()} className="self-start rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 sm:self-auto">Retry</button></div>}

      <div className="mb-3 flex justify-end"><button type="button" onClick={() => void loadMetrics()} disabled={Object.values(metrics).some((metric) => metric.status === 'loading')} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Refresh overview</button></div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Transport overview">
        <MetricCard label="Total vans" metric={metrics.vans} emptyText="No vans registered" />
        <MetricCard label="Active drivers" metric={metrics.drivers} emptyText="No active drivers" />
        <MetricCard label="Active trips" metric={metrics.trips} emptyText="No active trips" />
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50"><p className="text-sm font-medium text-slate-500">Students</p><p className="mt-5 text-lg font-semibold text-slate-400">Unavailable</p><p className="mt-1 text-xs text-slate-500">No school-wide student listing endpoint</p></article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Recent activity</h2><p className="mt-1 text-sm text-slate-500">Latest transport updates for your school</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-500">Not connected</span></div>
          <div className="mt-6 grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 px-5 text-center">
            <div><p className="text-sm font-medium text-slate-700">Activity feed unavailable</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">There is no school-wide admin activity endpoint. No sample activity is shown.</p></div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
          <h2 className="font-semibold">System status</h2><p className="mt-1 text-sm text-slate-500">Live status from the health endpoint</p>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            {health.status === 'loading' && <p className="text-sm text-slate-500" role="status">Checking the API…</p>}
            {health.status === 'connected' && <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">✓</span><div><p className="text-sm font-medium text-slate-800">API responding</p><p className="text-xs text-slate-500">{health.message}</p></div></div>}
            {health.status === 'error' && <p className="text-sm text-rose-700" role="alert">{health.message}</p>}
          </div>
          {health.status !== 'connected' && <button type="button" onClick={() => void loadHealth()} disabled={health.status === 'loading'} className="mt-4 text-sm font-semibold text-cyan-800 hover:text-cyan-950 disabled:opacity-50">{health.status === 'loading' ? 'Checking…' : 'Retry connection'}</button>}
        </article>
      </section>
      <nav className="mt-8 flex flex-wrap gap-3" aria-label="Admin shortcuts">
        <Link to="/dashboard/vans" className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">Manage vans</Link>
        <Link to="/dashboard/drivers" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">View drivers</Link>
        <Link to="/dashboard/live-tracking" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Live tracking</Link>
      </nav>
    </DashboardLayout>
  );
}
