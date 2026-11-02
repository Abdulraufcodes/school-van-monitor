import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { updateVanLocation } from '../../services/van.service.js';
import { canTrackTrip, createDriverLocationTracker } from '../../utils/driverLocationTracking.js';

const stateLabels = {
  'waiting-permission': 'Waiting for permission',
  acquiring: 'Acquiring location',
  tracking: 'Tracking',
  'permission-denied': 'Permission denied',
  'gps-unavailable': 'GPS unavailable',
  'network-unavailable': 'Network unavailable',
  'location-rejected': 'Location update not accepted',
  unsupported: 'GPS not supported',
  stopped: 'Tracking stopped'
};

function formatTime(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(date)
    : 'Not yet updated';
}

export function DriverLocationStatus({ trip }) {
  const { isAuthenticated } = useAuth();
  const [tracking, setTracking] = useState({ state: 'stopped', message: '', lastSuccessAt: null });
  const [retryKey, setRetryKey] = useState(0);
  const enabled = canTrackTrip(trip, isAuthenticated);
  const tracker = useMemo(() => createDriverLocationTracker({
    trip,
    isAuthenticated,
    geolocation: globalThis.navigator?.geolocation,
    updateLocation: updateVanLocation,
    onStateChange: setTracking
  }), [trip?.id, trip?.vanId, trip?.status, isAuthenticated, retryKey]);

  useEffect(() => {
    tracker.start();
    return () => tracker.stop(false);
  }, [tracker]);

  const retryable = enabled && ['permission-denied', 'gps-unavailable', 'network-unavailable', 'location-rejected', 'unsupported'].includes(tracking.state);
  const tone = tracking.state === 'tracking'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : ['permission-denied', 'gps-unavailable', 'network-unavailable', 'location-rejected', 'unsupported'].includes(tracking.state)
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : 'border-slate-200 bg-white text-slate-800';

  return (
    <section className={`mb-5 rounded-xl border p-4 ${tone}`} aria-live="polite" aria-labelledby="gps-status-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="gps-status-heading" className="text-sm font-semibold">GPS location: {stateLabels[tracking.state] || stateLabels.stopped}</h2>
          <p className="mt-1 text-sm opacity-85">Last delivered update: {formatTime(tracking.lastSuccessAt)}</p>
          {tracking.message && <p className="mt-1 text-sm" role="status">{tracking.message}</p>}
          {enabled && <p className="mt-1 text-xs opacity-75">Keep this page open during the trip. Tracking may pause when the browser is suspended or closed.</p>}
        </div>
        {retryable && <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="min-h-10 rounded-lg border border-current/20 bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2">Retry GPS</button>}
      </div>
    </section>
  );
}
