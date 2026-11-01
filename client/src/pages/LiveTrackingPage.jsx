import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { getAdminActiveTrips } from '../services/trip.service.js';
import { formatFleetTimestamp, getLocationFreshness, getTripLocationSummary, hasValidCoordinates, reconcileSelectedTripId } from '../utils/fleetMonitoring.js';
import { FleetMap } from '../components/tracking/FleetMap.jsx';

const POLL_INTERVAL_MS = 15000;

function getLoadError(error) {
  return error.response?.data?.message || 'Active trips could not be loaded. Check your connection and try again.';
}

function LocationBadge({ location }) {
  const label = getLocationFreshness(location);
  const styles = location?.isStale === true
    ? 'bg-amber-50 text-amber-800 ring-amber-600/15'
    : location?.isStale === false
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/15'
      : 'bg-slate-100 text-slate-700 ring-slate-500/15';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles}`}>{label}</span>;
}

function ActiveTripCard({ item, selected, onSelect }) {
  const trip = item?.trip;
  const van = item?.van;
  const driver = item?.driver;
  const location = item?.location;
  const tripStatus = typeof trip?.status === 'string' && trip.status
    ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1)
    : 'Trip status unavailable';
  const hasCoordinates = Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);

  return (
    <button type="button" aria-pressed={selected} onClick={() => onSelect(trip?.id)} className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm shadow-slate-200/40 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 sm:p-6 ${selected ? 'border-cyan-600 ring-2 ring-cyan-600/20' : 'border-slate-200 hover:border-cyan-300'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Vehicle registration</p>
          <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-slate-950">{van?.registrationNumber || 'Van information unavailable'}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 ring-1 ring-inset ring-cyan-600/15">{tripStatus}</span>
          {van?.isActive === false && <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-500/15">Van inactive</span>}
        </div>
      </div>

      <div className="mt-5 grid gap-5 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Driver</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{driver?.name || 'Driver information unavailable'}</p>
          {driver?.isActive === false && <p className="mt-1 text-xs font-medium text-slate-600">Driver inactive</p>}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Trip started</p>
          <p className="mt-2 text-sm text-slate-700">{formatFleetTimestamp(trip?.startedAt)}</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">Latest location</p>
          {location && <LocationBadge location={location} />}
        </div>
        {!location
          ? <p className="mt-2 text-sm text-slate-600">Location unavailable for this trip.</p>
          : <>
            {hasCoordinates
              ? <p className="mt-2 break-words font-mono text-sm text-slate-800">{location.latitude}, {location.longitude}</p>
              : <p className="mt-2 text-sm text-slate-600">Coordinates unavailable.</p>}
            {Number.isFinite(location.ageInSeconds) && location.ageInSeconds >= 0 && <p className="mt-1 text-xs text-slate-500">Location age: {location.ageInSeconds} seconds</p>}
            <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <div><dt className="font-medium text-slate-700">Recorded</dt><dd className="mt-0.5">{formatFleetTimestamp(location.recordedAt)}</dd></div>
              <div><dt className="font-medium text-slate-700">Received</dt><dd className="mt-0.5">{formatFleetTimestamp(location.receivedAt)}</dd></div>
            </dl>
          </>}
      </div>
    </button>
  );
}

export function LiveTrackingPage() {
  const [trips, setTrips] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialError, setInitialError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const mountedRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const inFlightRef = useRef(null);

  useEffect(() => {
    setSelectedTripId((current) => reconcileSelectedTripId(current, trips));
  }, [trips]);

  const refresh = useCallback(async () => {
    if (!mountedRef.current || document.visibilityState === 'hidden' || inFlightRef.current) return;

    const controller = new AbortController();
    const requestId = ++requestSequenceRef.current;
    inFlightRef.current = { controller, requestId };
    if (hasLoadedRef.current) setRefreshing(true);
    else setInitialLoading(true);

    try {
      const nextTrips = await getAdminActiveTrips({ signal: controller.signal });
      if (!mountedRef.current || requestId !== requestSequenceRef.current) return;
      hasLoadedRef.current = true;
      setTrips(nextTrips);
      setLastUpdated(new Date());
      setInitialError('');
      setRefreshError('');
    } catch (error) {
      if (!mountedRef.current || requestId !== requestSequenceRef.current || controller.signal.aborted) return;
      if (hasLoadedRef.current) setRefreshError(getLoadError(error));
      else setInitialError(getLoadError(error));
    } finally {
      if (inFlightRef.current?.requestId === requestId) inFlightRef.current = null;
      if (mountedRef.current && requestId === requestSequenceRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void refresh();
    }, POLL_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const current = inFlightRef.current;
        if (current) {
          ++requestSequenceRef.current;
          inFlightRef.current = null;
          current.controller.abort();
          if (hasLoadedRef.current) setRefreshing(false);
        }
      } else {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      inFlightRef.current?.controller.abort();
      inFlightRef.current = null;
      ++requestSequenceRef.current;
    };
  }, [refresh]);

  const locationSummary = getTripLocationSummary(trips);
  const selectedTrip = trips.find((item) => String(item?.trip?.id) === String(selectedTripId));
  const isBusy = initialLoading || refreshing;

  return (
    <DashboardLayout title="Live Tracking">
      <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-cyan-700">Fleet monitoring</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Live Tracking</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Monitor currently active school trips and review their latest reported locations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-600" aria-live="polite">Last successful refresh: <span className="font-medium text-slate-800">{lastUpdated ? formatFleetTimestamp(lastUpdated) : 'Not yet refreshed'}</span></p>
          <button type="button" onClick={() => void refresh()} disabled={isBusy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}><path d="M20 7v5h-5M4 17v-5h5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {isBusy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30" aria-label="Active trip summary">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Active trips</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950" aria-live="polite">{hasLoadedRef.current ? trips.length : '—'}</p>
      </section>

      {refreshError && <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-amber-900">Fleet data may be out of date</p><p className="mt-1 text-sm text-amber-800" role="status">{refreshError} Previously loaded trip data is still shown.</p></div><button type="button" onClick={() => void refresh()} disabled={isBusy} className="self-start rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 sm:self-auto">Retry</button></div>}

      <section aria-label="Active school trips" aria-live="polite">
        {initialLoading && <div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-sm text-slate-600" role="status">Loading active trips…</p></div>}
        {!initialLoading && initialError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6"><p className="text-sm font-semibold text-rose-900">Active trips could not be loaded</p><p className="mt-1 text-sm text-rose-800" role="alert">{initialError}</p><button type="button" onClick={() => void refresh()} disabled={isBusy} className="mt-4 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50">Retry</button></div>}
        {!initialLoading && !initialError && <div className="grid items-start gap-5 xl:grid-cols-5">
          <div className="min-w-0 xl:sticky xl:top-20 xl:col-span-3"><FleetMap trips={trips} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId}/></div>
          <div className="min-w-0 space-y-4 xl:col-span-2">
            {trips.length === 0 && <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><div><h2 className="text-base font-semibold text-slate-900">No active trips</h2><p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">There are no currently active school trips to display.</p></div></div>}
            {trips.length > 0 && locationSummary === 'none' && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">No trip locations reported yet</p><p className="mt-1 text-sm text-amber-800">Active trips are available, but none currently include a recorded location.</p></div>}
            {selectedTrip && !hasValidCoordinates(selectedTrip.location) && <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4" role="status"><p className="text-sm font-semibold text-cyan-900">Selected trip location unavailable</p><p className="mt-1 text-sm text-cyan-800">This active trip has no valid coordinates to focus on the map.</p></div>}
            {trips.length > 0 && <div className="space-y-4" aria-label="Active trip list">{trips.map((item) => <ActiveTripCard key={item.trip.id} item={item} selected={String(item.trip.id) === String(selectedTripId)} onSelect={setSelectedTripId}/>)}</div>}
          </div>
        </div>}
      </section>
    </DashboardLayout>
  );
}
