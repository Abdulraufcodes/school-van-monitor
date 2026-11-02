import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { FleetMap } from '../components/tracking/FleetMap.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getParentStudents } from '../services/parent.service.js';
import { formatFleetTimestamp, getLocationFreshness } from '../utils/fleetMonitoring.js';

const POLL_INTERVAL_MS = 15000;

function getLoadError(error) {
  return error.response?.data?.message || 'Your child’s active trip could not be loaded. Check your connection and try again.';
}

export function ParentLiveTrackingPage() {
  const { accessToken } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [selectedTripId, setSelectedTripId] = useState(null);
  const socketRef = useRef(null);
  const requestRef = useRef(0);

  const loadStudents = useCallback(async () => {
    const requestId = ++requestRef.current;
    try {
      const result = await getParentStudents();
      if (requestRef.current !== requestId) return;
      setStudents(result); setError('');
      const socket = socketRef.current;
      if (socket?.connected) [...new Set(result.map((item) => item.trip?.id).filter(Boolean))].forEach((tripId) => {
        socket.emit('trip:subscribe', { tripId }, (response) => {
          if (!response?.success) setConnectionError('Live updates could not be authorized for one of the active trips.');
        });
      });
    } catch (cause) {
      if (requestRef.current === requestId) setError(getLoadError(cause));
    } finally { if (requestRef.current === requestId) setLoading(false); }
  }, []);

  useEffect(() => {
    void loadStudents();
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, { auth: { token: accessToken }, reconnection: true });
    socketRef.current = socket;
    socket.on('connect', () => { setConnectionError(''); void loadStudents(); });
    socket.on('location:updated', (location) => {
      setStudents((current) => current.map((item) => String(item.trip?.id) === String(location.tripId)
        ? { ...item, location: { latitude: location.latitude, longitude: location.longitude, recordedAt: location.recordedAt, receivedAt: location.receivedAt, ageInSeconds: 0, isStale: false } }
        : item));
    });
    socket.on('trip:status', (trip) => { if (trip.status !== 'active') void loadStudents(); });
    socket.on('connect_error', () => setConnectionError('Live updates are reconnecting. The map will refresh from saved locations.'));
    const intervalId = window.setInterval(() => { if (document.visibilityState !== 'hidden') void loadStudents(); }, POLL_INTERVAL_MS);
    const refreshWhenVisible = () => { if (document.visibilityState !== 'hidden') void loadStudents(); };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => { requestRef.current += 1; socketRef.current = null; socket.disconnect(); window.clearInterval(intervalId); document.removeEventListener('visibilitychange', refreshWhenVisible); };
  }, [accessToken, loadStudents]);

  const trips = useMemo(() => [...new Map(students.filter((item) => item.trip).map((item) => [item.trip.id, { trip: item.trip, van: item.van, driver: item.driver, location: item.location }])).values()], [students]);
  const selectedTrip = trips.find((item) => String(item.trip.id) === String(selectedTripId));

  return <DashboardLayout title="Live Tracking">
    <section className="mb-6"><p className="text-sm font-medium text-cyan-700">Family workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Your child’s van</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">See active van trips and the latest saved GPS location for your linked children.</p></section>
    {connectionError && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">{connectionError}</p>}
    {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}<button type="button" onClick={() => void loadStudents()} className="ml-2 font-semibold underline">Retry</button></div>}
    {loading ? <p className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500" role="status">Loading linked students…</p> : <>
      {students.length === 0 && !error && <div className="mb-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="font-semibold text-slate-900">No linked students yet</h2><p className="mt-2 text-sm text-slate-600">Ask your school to add your parent account to your child’s student record.</p></div>}
      {students.length > 0 && <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]"><div className="min-w-0"><FleetMap trips={trips} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId}/></div><div className="space-y-3">{students.map((item) => <article key={item.student.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${item.trip?.id === selectedTripId ? 'border-cyan-500 ring-2 ring-cyan-500/15' : 'border-slate-200'}`}><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold text-slate-950">{item.student.name}</h2><p className="mt-1 text-sm text-slate-600">{item.student.className || 'Class not set'}</p></div>{item.trip && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-800">Trip active</span>}</div>{!item.trip ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No active van trip right now.</p> : <><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm"><div><dt className="text-xs text-slate-500">Van</dt><dd className="mt-1 font-medium">{item.van?.registrationNumber || 'Unavailable'}</dd></div><div><dt className="text-xs text-slate-500">Driver</dt><dd className="mt-1 font-medium">{item.driver?.name || 'Unavailable'}</dd></div><div><dt className="text-xs text-slate-500">Trip</dt><dd className="mt-1 font-medium">{item.trip.tripType === 'morning_pickup' ? 'Morning pickup' : 'Afternoon drop-off'}</dd></div><div><dt className="text-xs text-slate-500">Location status</dt><dd className="mt-1 font-medium">{item.location ? getLocationFreshness(item.location) : 'Awaiting GPS'}</dd></div></dl>{item.location && <p className="mt-3 text-xs text-slate-500">Last location received {formatFleetTimestamp(item.location.receivedAt)}{item.location.isStale ? ` · ${item.location.ageInSeconds}s old` : ''}</p>}<button type="button" onClick={() => setSelectedTripId(item.trip.id)} className="mt-4 w-full rounded-lg border border-cyan-200 px-3 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-50">{item.location ? 'Focus on map' : 'Select trip'}</button></>}</article>)}</div></div>}
      {selectedTrip && !selectedTrip.location && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">This active trip has not reported a valid GPS location yet.</p>}
    </>}
  </DashboardLayout>;
}
