import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { StudentRoster } from '../components/driver/StudentRoster.jsx';
import { DriverLocationStatus } from '../components/driver/DriverLocationStatus.jsx';
import { getAssignedVans } from '../services/driver.service.js';
import { endTrip, getActiveTrip, startTrip } from '../services/trip.service.js';
import {
  formatTripStartTime,
  canStartTrip,
  getTripPanelState,
  isVanSelectable,
  tripTypeOptions,
  tryAcquireActionLock
} from '../utils/driverDashboard.js';

function getRequestError(error, fallback) {
  return error.response?.data?.message
    || (error.request ? 'Could not reach the server. Check your connection and try again.' : fallback);
}

function TripTypeChoice({ option, selected, disabled, onChange }) {
  return (
    <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${selected ? 'border-cyan-700 bg-cyan-50 ring-2 ring-cyan-700/10' : 'border-slate-200 bg-white hover:border-slate-300'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
      <input
        type="radio"
        name="tripType"
        value={option.value}
        checked={selected}
        disabled={disabled}
        onChange={() => onChange(option.value)}
        className="mt-1 h-4 w-4 accent-cyan-700 focus:ring-cyan-700"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-600">{option.description}</span>
      </span>
    </label>
  );
}

function ActiveTripCard({ trip, vans, action, onEnd }) {
  const assignedVan = vans.find((van) => String(van.id) === String(trip.vanId));
  const tripType = tripTypeOptions.find((option) => option.value === trip.tripType)?.label || 'Trip type unavailable';

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="active-trip-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-cyan-700">Driver workspace</p>
          <h1 id="active-trip-heading" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Your active trip</h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />Active
        </span>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Trip type</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{tripType}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Van</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{assignedVan?.registrationNumber || 'Registration unavailable'}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Service date</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{trip.serviceDate || 'Unavailable'}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Started</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{formatTripStartTime(trip.startedAt)}</dd></div>
      </dl>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">End this trip when the run is complete.</p>
        <button type="button" onClick={onEnd} disabled={Boolean(action)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
          {action === 'end' ? 'Ending trip…' : 'End Trip'}
        </button>
      </div>
    </section>
  );
}

export function DriverDashboardPage() {
  const location = useLocation();
  const [vans, setVans] = useState([]);
  const [vansLoading, setVansLoading] = useState(true);
  const [vansError, setVansError] = useState('');
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState('');
  const [selectedVanId, setSelectedVanId] = useState('');
  const [tripType, setTripType] = useState('');
  const [action, setAction] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const actionLock = useRef(false);
  const mounted = useRef(false);

  const loadDashboard = useCallback(async () => {
    setVansLoading(true);
    setTripLoading(true);
    setVansError('');
    setTripError('');

    const [vansResult, tripResult] = await Promise.allSettled([getAssignedVans(), getActiveTrip()]);
    if (!mounted.current) return;

    if (vansResult.status === 'fulfilled') setVans(vansResult.value);
    else setVansError(getRequestError(vansResult.reason, 'Assigned vans could not be loaded.'));

    if (tripResult.status === 'fulfilled') setActiveTrip(tripResult.value);
    else setTripError(getRequestError(tripResult.reason, 'Your active trip could not be restored.'));

    setVansLoading(false);
    setTripLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadDashboard();
    return () => { mounted.current = false; };
  }, [loadDashboard]);

  async function handleStartTrip() {
    if (getTripPanelState({ loading: tripLoading, error: tripError, trip: activeTrip }) !== 'ready'
      || !tryAcquireActionLock(actionLock)) return;
    const van = vans.find((item) => String(item.id) === String(selectedVanId));
    if (!isVanSelectable(van) || !tripType) {
      actionLock.current = false;
      return;
    }

    setAction('start');
    setActionError('');
    setNotice('');
    try {
      const trip = await startTrip({ vanId: van.id, tripType });
      if (mounted.current) setActiveTrip(trip);
    } catch (error) {
      if (mounted.current) setActionError(getRequestError(error, 'Trip could not be started.'));
    } finally {
      actionLock.current = false;
      if (mounted.current) setAction('');
    }
  }

  async function handleEndTrip() {
    if (!activeTrip || !tryAcquireActionLock(actionLock)) return;
    if (!window.confirm('End your active trip?')) {
      actionLock.current = false;
      return;
    }

    setAction('end');
    setActionError('');
    setNotice('');
    try {
      await endTrip(activeTrip.id);
      if (mounted.current) {
        setActiveTrip(null);
        setSelectedVanId('');
        setTripType('');
        setNotice('Trip ended successfully.');
      }
    } catch (error) {
      if (mounted.current) setActionError(getRequestError(error, 'Trip could not be ended.'));
    } finally {
      actionLock.current = false;
      if (mounted.current) setAction('');
    }
  }

  const panelState = getTripPanelState({ loading: tripLoading, error: tripError, trip: activeTrip });
  const selectedVan = vans.find((van) => String(van.id) === String(selectedVanId));
  const isTripRoute = location.pathname === '/driver/trip';
  const startEnabled = canStartTrip({ panelState, vansLoading, vansError, selectedVan, tripType, action });

  return (
    <DashboardLayout title={isTripRoute ? 'My Trip' : 'Dashboard'}>
      <section className="mb-6">
        <p className="text-sm font-medium text-cyan-700">Driver workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{panelState === 'active' ? 'Your trip' : 'Trip management'}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Start a morning pickup or afternoon drop-off, then end the trip when the run is complete.</p>
      </section>

      <DriverLocationStatus trip={panelState === 'active' ? activeTrip : null}/>

      {notice && <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
      {actionError && <p className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{actionError}</p>}

      {panelState === 'loading' && <div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-sm text-slate-600" role="status">Restoring your active trip…</p></div>}

      {panelState === 'error' && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6"><h2 className="text-base font-semibold text-rose-900">Active trip status unavailable</h2><p className="mt-1 text-sm text-rose-800" role="alert">{tripError}</p><p className="mt-2 text-sm text-rose-800">Starting a trip is disabled until the server confirms whether one is active.</p><button type="button" onClick={() => void loadDashboard()} disabled={tripLoading || vansLoading} className="mt-4 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60">Retry</button></div>}

      {panelState === 'active' && <>
        <ActiveTripCard trip={activeTrip} vans={vans} action={action} onEnd={() => void handleEndTrip()}/>
        <StudentRoster trip={activeTrip}/>
      </>}

      {panelState === 'ready' && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="start-trip-heading">
        <div><h2 id="start-trip-heading" className="text-lg font-semibold text-slate-950">Start a trip</h2><p className="mt-1 text-sm text-slate-600">Choose an active assigned van and trip type.</p></div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-800">Assigned vans</h3>
          {vansLoading && <p className="mt-3 text-sm text-slate-600" role="status">Loading assigned vans…</p>}
          {!vansLoading && vansError && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm text-rose-800" role="alert">{vansError}</p><button type="button" onClick={() => void loadDashboard()} disabled={tripLoading} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60">Retry</button></div>}
          {!vansLoading && !vansError && vans.length === 0 && <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">No vans are currently assigned to your account. Contact your school administrator for an assignment.</p>}
          {!vansLoading && !vansError && vans.length > 0 && <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {vans.map((van) => {
              const available = isVanSelectable(van);
              return <button key={van.id} type="button" disabled={!available || Boolean(action)} aria-pressed={selectedVanId === van.id} onClick={() => setSelectedVanId(van.id)} className={`flex min-h-16 items-center justify-between gap-3 rounded-xl border p-4 text-left focus:outline-none focus:ring-2 focus:ring-cyan-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-65 ${selectedVanId === van.id ? 'border-cyan-700 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{van.registrationNumber || 'Registration unavailable'}</span><span className="mt-1 block text-xs text-slate-600">{available ? 'Assigned van' : 'Unavailable for trips'}</span></span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${available ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{available ? 'Active' : 'Inactive'}</span>
              </button>;
            })}
          </div>}
        </div>

        <fieldset className="mt-6" disabled={vansLoading || Boolean(vansError) || Boolean(action)}>
          <legend className="text-sm font-semibold text-slate-800">Trip type</legend>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {tripTypeOptions.map((option) => <TripTypeChoice key={option.value} option={option} selected={tripType === option.value} disabled={false} onChange={setTripType}/>) }
          </div>
        </fieldset>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <button type="button" onClick={() => void handleStartTrip()} disabled={!startEnabled} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
            {action === 'start' ? 'Starting trip…' : 'Start Trip'}
          </button>
          {(!vansLoading && !vansError && vans.length > 0 && !vans.some(isVanSelectable)) && <p className="mt-3 text-sm text-slate-600">No active assigned vans are available to start a trip.</p>}
        </div>
      </section>}
    </DashboardLayout>
  );
}
