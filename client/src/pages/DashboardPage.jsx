import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getApiHealth } from '../services/dashboard.service.js';

const navigation = [
  { label: 'Overview', path: '/dashboard', available: true, icon: '▦' },
  { label: 'Vans', available: false, icon: '▰' },
  { label: 'Students', available: false, icon: '◉' },
  { label: 'Drivers', available: false, icon: '♙' },
  { label: 'Parents', available: false, icon: '♧' },
  { label: 'Live Tracking', available: false, icon: '⌖' },
  { label: 'Transportation Records', available: false, icon: '▤' }
];

const metrics = [
  { label: 'Total vans', icon: '▰' },
  { label: 'Students', icon: '◉' },
  { label: 'Drivers', icon: '♙' },
  { label: 'Active trips', icon: '⌖' }
];

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [health, setHealth] = useState({ status: 'loading', message: '' });

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

  useEffect(() => { loadHealth(); }, [loadHealth]);

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'A';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {mobileNavOpen && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-slate-950/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col bg-slate-950 text-white transition-transform lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 text-lg text-slate-950" aria-hidden="true">▰</span>
          <div><p className="font-semibold tracking-tight">School Van</p><p className="text-xs text-slate-400">MONITOR</p></div>
          <button className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">✕</button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6" aria-label="Main navigation">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
          {navigation.map((item) => item.available ? (
            <NavLink key={item.label} to={item.path} end className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${isActive ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`} onClick={() => setMobileNavOpen(false)}>
              <span className="w-5 text-center" aria-hidden="true">{item.icon}</span>{item.label}
            </NavLink>
          ) : (
            <div key={item.label} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500" title="Backend endpoint not implemented">
              <span className="w-5 text-center" aria-hidden="true">{item.icon}</span><span className="flex-1">{item.label}</span><span className="text-[9px] uppercase tracking-wide">Soon</span>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-300/15 text-sm font-semibold text-cyan-200">{userInitial}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user?.name || 'School Admin'}</p><p className="truncate text-xs text-slate-400">{user?.email}</p></div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">☰</button>
            <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">School Admin</p><h1 className="text-lg font-semibold tracking-tight sm:text-xl">Dashboard</h1></div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-2 text-xs sm:flex">
              <span className={`h-2 w-2 rounded-full ${health.status === 'connected' ? 'bg-emerald-500' : health.status === 'error' ? 'bg-rose-500' : 'animate-pulse bg-amber-400'}`} />
              <span className="text-slate-500">{health.status === 'connected' ? 'System online' : health.status === 'error' ? 'System issue' : 'Checking system'}</span>
            </div>
            <button onClick={handleSignOut} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:text-sm">Sign out</button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-10">
          <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-sm font-medium text-cyan-700">Overview</p><h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Good to see you, {user?.name?.split(' ')[0] || 'Admin'}</h2><p className="mt-2 text-sm text-slate-500">Here’s the current picture of your school transport.</p></div>
            <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 sm:self-auto">
              <span className={`h-2 w-2 rounded-full ${health.status === 'connected' ? 'bg-emerald-500' : health.status === 'error' ? 'bg-rose-500' : 'animate-pulse bg-amber-400'}`} />
              {health.status === 'connected' ? 'API connected' : health.status === 'error' ? 'API unavailable' : 'Checking API'}
            </div>
          </section>

          {health.status === 'error' && <div className="mb-6 flex flex-col justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center"><p className="text-sm text-rose-800" role="alert">{health.message}</p><button onClick={loadHealth} className="self-start rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 sm:self-auto">Retry</button></div>}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Transport overview">
            {metrics.map((metric) => <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
              <div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{metric.label}</p><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-lg text-slate-500" aria-hidden="true">{metric.icon}</span></div>
              <p className="mt-6 text-2xl font-semibold text-slate-400">—</p>
              <p className="mt-1 text-xs text-slate-400">Not connected</p>
            </article>)}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
              <div className="flex items-center justify-between"><div><h3 className="font-semibold">Recent activity</h3><p className="mt-1 text-sm text-slate-500">Latest transport updates for your school</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-500">Not connected</span></div>
              <div className="mt-6 grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 px-5 text-center">
                <div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400" aria-hidden="true">▤</span><p className="mt-3 text-sm font-medium text-slate-700">Activity feed unavailable</p><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">The backend does not currently provide an admin activity endpoint. No sample activity is shown.</p></div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
              <h3 className="font-semibold">System status</h3><p className="mt-1 text-sm text-slate-500">Live status from the health endpoint</p>
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                {health.status === 'loading' && <p className="text-sm text-slate-500" role="status">Checking the API…</p>}
                {health.status === 'connected' && <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">✓</span><div><p className="text-sm font-medium text-slate-800">All systems responding</p><p className="text-xs text-slate-500">{health.message}</p></div></div>}
                {health.status === 'error' && <p className="text-sm text-rose-700" role="alert">{health.message}</p>}
              </div>
              {health.status !== 'connected' && <button onClick={loadHealth} disabled={health.status === 'loading'} className="mt-4 text-sm font-semibold text-cyan-800 hover:text-cyan-950 disabled:opacity-50">{health.status === 'loading' ? 'Checking…' : 'Retry connection'}</button>}
            </article>
          </section>

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">Dashboard data and management tools will appear here when their backend APIs are available.</p>
        </main>
      </div>
    </div>
  );
}
