import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTripStudentStatuses,
  requestDropoffOtp,
  requestPickupOtp,
  verifyDropoffOtp,
  verifyPickupOtp
} from '../../services/studentEvent.service.js';
import { formatTripStartTime, tryAcquireActionLock } from '../../utils/driverDashboard.js';
import { applyVerifiedEvent, getStudentEventError, sortRosterStudents } from '../../utils/driverRoster.js';

const RESEND_COOLDOWN_FALLBACK_SECONDS = 60;

function formatEventTime(value) {
  return formatTripStartTime(value);
}

function StudentCard({ trip, student, tripType, onVerified }) {
  const [otp, setOtp] = useState('');
  const [otpState, setOtpState] = useState(null);
  const [clock, setClock] = useState(Date.now());
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const isMorning = tripType === 'morning_pickup';
  const completed = isMorning
    ? student.pickupStatus === 'picked_up'
    : student.dropoffStatus === 'dropped_off';
  const eventTime = isMorning ? student.pickupTime : student.dropoffTime;
  const expiresIn = otpState ? Math.max(0, Math.ceil((otpState.expiresAt - clock) / 1000)) : 0;
  const resendIn = otpState ? Math.max(0, Math.ceil((otpState.resendAt - clock) / 1000)) : 0;

  useEffect(() => {
    if (!otpState) return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [otpState]);

  async function handleRequestOtp() {
    if (resendIn > 0 || !tryAcquireActionLock(lock)) return;
    setBusy('request');
    setError('');
    setNotice('');
    try {
      const result = isMorning
        ? await requestPickupOtp(trip.id, student.studentId)
        : await requestDropoffOtp(trip.id, student.studentId);
      const now = Date.now();
      setOtpState({
        expiresAt: now + result.expiresInSeconds * 1000,
        resendAt: now + result.resendAvailableInSeconds * 1000
      });
      setClock(now);
      setOtp('');
      setNotice('A verification code was sent to the linked parent email.');
    } catch (caught) {
      setError(getStudentEventError(caught));
      if (caught.response?.data?.code === 'OTP_RESEND_COOLDOWN') {
        const now = Date.now();
        setOtpState((current) => ({
          expiresAt: current?.expiresAt ?? now,
          resendAt: now + RESEND_COOLDOWN_FALLBACK_SECONDS * 1000
        }));
        setClock(now);
      }
    } finally {
      lock.current = false;
      setBusy('');
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    if (otp.length !== 6 || expiresIn === 0 || !tryAcquireActionLock(lock)) return;
    setBusy('verify');
    setError('');
    setNotice('');
    try {
      const verifiedEvent = isMorning
        ? await verifyPickupOtp(trip.id, student.studentId, otp)
        : await verifyDropoffOtp(trip.id, student.studentId, otp);
      setOtp('');
      setOtpState(null);
      onVerified(verifiedEvent);
    } catch (caught) {
      setError(getStudentEventError(caught));
      const code = caught.response?.data?.code;
      if (code === 'OTP_INVALID') setOtp('');
      if (code === 'OTP_EXPIRED') setOtpState((current) => current ? { ...current, expiresAt: Date.now() } : current);
    } finally {
      lock.current = false;
      setBusy('');
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="truncate text-base font-semibold text-slate-950">{student.name}</h3><p className="mt-1 text-sm text-slate-600">{student.className || 'Class unavailable'}</p></div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${completed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{completed ? (isMorning ? 'Picked up' : 'Dropped off') : (isMorning ? 'Pickup pending' : 'Drop-off pending')}</span>
      </div>

      {tripType === 'afternoon_dropoff' && <p className="mt-3 text-sm text-slate-600">Morning pickup confirmed{student.pickupTime ? ` · ${formatEventTime(student.pickupTime)}` : ''}</p>}
      {completed && <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">{isMorning ? 'Pickup' : 'Drop-off'} confirmed by server · {formatEventTime(eventTime)}</p>}

      {!completed && <div className="mt-4 border-t border-slate-100 pt-4">
        {!otpState && <button type="button" onClick={() => void handleRequestOtp()} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{busy === 'request' ? 'Sending code…' : `Request ${isMorning ? 'Pickup' : 'Drop-off'} Code`}</button>}

        {otpState && <>
          {expiresIn > 0
            ? <p className="mb-3 text-sm text-slate-600">Code expires in {Math.floor(expiresIn / 60)}:{String(expiresIn % 60).padStart(2, '0')}.</p>
            : <p className="mb-3 text-sm font-medium text-amber-800" role="status">Code expired. Request a new code when the resend timer ends.</p>}
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-xs"><label htmlFor={`otp-${student.studentId}`} className="mb-1.5 block text-sm font-medium text-slate-700">Six-digit code</label><input id={`otp-${student.studentId}`} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={Boolean(busy) || expiresIn === 0} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base tracking-[0.25em] outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-700/15 disabled:bg-slate-100" aria-describedby={`otp-help-${student.studentId}`} /></div>
            <button type="submit" disabled={otp.length !== 6 || expiresIn === 0 || Boolean(busy)} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{busy === 'verify' ? 'Verifying…' : 'Verify Code'}</button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void handleRequestOtp()} disabled={resendIn > 0 || Boolean(busy)} className="text-sm font-semibold text-cyan-800 hover:text-cyan-950 disabled:cursor-not-allowed disabled:text-slate-400">{resendIn > 0 ? `Resend available in ${resendIn}s` : 'Send a new code'}</button><p id={`otp-help-${student.studentId}`} className="text-xs text-slate-500">Codes are sent to linked parent email addresses.</p></div>
        </>}

        {error && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
        {notice && <p className="mt-3 text-sm text-emerald-800" role="status">{notice}</p>}
      </div>}
    </article>
  );
}

export function StudentRoster({ trip }) {
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const hasLoaded = useRef(false);
  const requestId = useRef(0);

  const loadRoster = useCallback(async (confirmedEvent = null) => {
    if (!['morning_pickup', 'afternoon_dropoff'].includes(trip.tripType)) return;
    const currentRequest = ++requestId.current;
    if (hasLoaded.current) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const result = await getTripStudentStatuses(trip.id);
      if (!mounted.current || currentRequest !== requestId.current) return;
      hasLoaded.current = true;
      const students = confirmedEvent ? applyVerifiedEvent(result.students, confirmedEvent) : result.students;
      setRoster({ ...result, students });
    } catch (caught) {
      if (mounted.current && currentRequest === requestId.current) {
        setError(getStudentEventError(caught));
      }
    } finally {
      if (mounted.current && currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [trip.id, trip.tripType]);

  useEffect(() => {
    mounted.current = true;
    void loadRoster();
    return () => {
      mounted.current = false;
      ++requestId.current;
    };
  }, [loadRoster]);

  function handleVerified(event) {
    setRoster((current) => current
      ? { ...current, students: applyVerifiedEvent(current.students, event) }
      : current);
    void loadRoster(event);
  }

  const students = sortRosterStudents(roster?.students, trip.tripType);
  const isSupportedTrip = ['morning_pickup', 'afternoon_dropoff'].includes(trip.tripType);
  const isAfternoon = trip.tripType === 'afternoon_dropoff';

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6" aria-labelledby="student-roster-heading" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium text-cyan-700">Active trip roster</p><h2 id="student-roster-heading" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{isAfternoon ? 'Afternoon drop-off' : 'Morning pickup'} students</h2><p className="mt-1 text-sm text-slate-600">Student status updates only after server verification.</p></div>
        <button type="button" onClick={() => void loadRoster()} disabled={loading || refreshing || !isSupportedTrip} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{refreshing ? 'Refreshing…' : 'Refresh roster'}</button>
      </div>

      {!isSupportedTrip && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">Student actions are unavailable because this trip has no supported trip type.</p>}
      {isSupportedTrip && loading && <p className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600" role="status">Loading assigned students…</p>}
      {isSupportedTrip && error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm text-rose-800" role="alert">{error}</p><button type="button" onClick={() => void loadRoster()} disabled={refreshing} className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50">Retry roster</button></div>}
      {isSupportedTrip && !loading && roster && students.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm leading-6 text-slate-600">{isAfternoon ? 'No students have a verified morning pickup for this trip.' : 'No active students are assigned to this van.'}</p>}
      {isSupportedTrip && roster && students.length > 0 && <div className="mt-4 space-y-3">{students.map((student) => <StudentCard key={student.studentId} trip={trip} student={student} tripType={trip.tripType} onVerified={handleVerified}/>)}</div>}
    </section>
  );
}
