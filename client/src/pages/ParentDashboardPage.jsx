import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getParentNotifications } from '../services/notification.service.js';

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function ParentDashboardPage() {
  const { accessToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try { setNotifications(await getParentNotifications()); setError(''); }
    catch (cause) { setError(cause.response?.data?.message || 'Notifications could not be loaded.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, { auth: { token: accessToken }, reconnection: true });
    socket.on('connect', () => socket.emit('notifications:subscribe', {}, (result) => {
      if (result?.success) void loadNotifications();
    }));
    socket.on('notification:new', () => { void loadNotifications(); });
    socket.on('connect_error', () => setError('Live alerts are reconnecting. The notification list will refresh when the connection returns.'));
    const intervalId = window.setInterval(() => { if (document.visibilityState !== 'hidden') void loadNotifications(); }, 30000);
    const refreshWhenVisible = () => { if (document.visibilityState !== 'hidden') void loadNotifications(); };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => { window.clearInterval(intervalId); document.removeEventListener('visibilitychange', refreshWhenVisible); socket.disconnect(); };
  }, [accessToken, loadNotifications]);

  return <DashboardLayout title="Dashboard">
    <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-cyan-700">Family workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Pickup alerts</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">See when your child’s school van is approaching the saved pickup location.</p></div><Link to="/parent/live-tracking" className="rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-800">View live tracking</Link></section>
    {error && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">{error}<button type="button" onClick={() => void loadNotifications()} className="ml-2 font-semibold underline">Retry</button></div>}
    <section className="space-y-3" aria-label="Pickup approach notifications" aria-live="polite">
      {loading && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">Loading alerts…</p>}
      {!loading && !error && notifications.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h2 className="font-semibold text-slate-900">No pickup alerts yet</h2><p className="mt-2 text-sm text-slate-600">We’ll show an alert here when the van approaches your child’s pickup location during a morning trip.</p></div>}
      {!loading && notifications.map((notification) => <article key={notification.id} className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-50 text-cyan-800" aria-hidden="true">↗</span><div><h2 className="font-semibold text-slate-950">Van approaching {notification.student?.name || 'your child’s pickup point'}</h2><p className="mt-1 text-sm text-slate-600">{notification.van?.registrationNumber ? `Van ${notification.van.registrationNumber} is` : 'The school van is'} about {notification.distanceMeters} metres away.</p><p className="mt-2 text-xs text-slate-500">{formatTime(notification.occurredAt)}</p></div></div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900">Pickup alert</span></div></article>)}
    </section>
  </DashboardLayout>;
}
