import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { getDrivers } from '../services/driver.service.js';
import { getVans, updateVanDriver } from '../services/van.service.js';
import { filterVans, findAssignedDriver } from '../utils/vanManagement.js';
import { VanFormModal } from '../components/vans/VanFormModal.jsx';

function getLoadError(error, resource) {
  return error.response?.data?.message || `Could not load ${resource}. Check your connection and try again.`;
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function VanCard({ van, drivers, driversLoading, updating, onReassign }) {
  const driver = findAssignedDriver(van, drivers);
  const date = formatDate(van.createdAt);
  const activeLabel = van.isActive === true ? 'Active' : van.isActive === false ? 'Inactive' : 'Status unavailable';
  const activeStyles = van.isActive === true
    ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/15'
    : van.isActive === false
      ? 'bg-slate-100 text-slate-700 ring-slate-500/15'
      : 'bg-amber-50 text-amber-800 ring-amber-600/15';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 transition-shadow hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Vehicle registration</p><h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-slate-950">{van.registrationNumber || 'Registration unavailable'}</h2></div>
        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${activeStyles}`}>{activeLabel}</span>
      </div>
      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Assigned driver</p>
        {driver
          ? <div className="mt-2"><p className="text-sm font-semibold text-slate-800">{driver.name}</p><p className="mt-0.5 break-all text-sm text-slate-500">{driver.email}</p></div>
          : <p className="mt-2 text-sm text-slate-500">{driversLoading ? 'Loading driver information…' : 'Driver information unavailable'}</p>}
        <label className="mt-4 block text-sm font-medium text-slate-700">Reassign driver<select disabled={driversLoading || updating || !drivers.length} value={typeof van.assignedDriver === 'string' ? van.assignedDriver : van.assignedDriver?._id || ''} onChange={(event) => event.target.value && onReassign(van._id, event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"><option value="">Select an active driver</option>{drivers.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.email}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Reassignment is blocked while the van or selected driver has an active trip.</span></label>
        {date && <p className="mt-4 text-xs text-slate-500">Added {date}</p>}
      </div>
    </article>
  );
}

export function VansPage() {
  const [vans, setVans] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vansLoading, setVansLoading] = useState(true);
  const [driversLoading, setDriversLoading] = useState(true);
  const [vansError, setVansError] = useState('');
  const [driversError, setDriversError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [updatingVanId, setUpdatingVanId] = useState('');
  const [assignmentNotice, setAssignmentNotice] = useState('');

  const loadVans = useCallback(async () => {
    setVansLoading(true);
    setVansError('');
    try {
      setVans(await getVans());
    } catch (error) {
      setVansError(getLoadError(error, 'vans'));
    } finally {
      setVansLoading(false);
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    setDriversLoading(true);
    setDriversError('');
    try {
      setDrivers(await getDrivers());
    } catch (error) {
      setDriversError(getLoadError(error, 'active drivers'));
    } finally {
      setDriversLoading(false);
    }
  }, []);

  async function reassignDriver(vanId, driverId) {
    setUpdatingVanId(vanId); setAssignmentNotice(''); setVansError('');
    try { await updateVanDriver(vanId, driverId); setAssignmentNotice('Van driver assignment updated.'); await loadVans(); }
    catch (error) { setVansError(error.response?.data?.message || 'The van driver could not be reassigned.'); }
    finally { setUpdatingVanId(''); }
  }

  useEffect(() => {
    loadVans();
    loadDrivers();
  }, [loadVans, loadDrivers]);

  const filteredVans = useMemo(() => filterVans(vans, drivers, search), [vans, drivers, search]);

  return (
    <DashboardLayout title="Vans">
      <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-cyan-700">Fleet management</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Vans</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">View school vans and their assigned drivers.</p></div>
        <button type="button" onClick={() => setModalOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
          Create Van
        </button>
      </section>

      {driversError && <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-rose-900">Driver information unavailable</p><p className="mt-1 text-sm text-rose-800">{driversError}</p></div><button type="button" onClick={loadDrivers} disabled={driversLoading} className="self-start rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50 sm:self-auto">{driversLoading ? 'Retrying…' : 'Retry'}</button></div>}
      {assignmentNotice && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{assignmentNotice}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-5" aria-label="Van list controls">
        <label htmlFor="van-search" className="mb-2 block text-sm font-medium text-slate-700">Search vans</label>
        <div className="relative max-w-xl">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5" strokeLinecap="round"/></svg>
          <input id="van-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Registration, driver name, or email" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15" />
        </div>
      </section>

      <section className="mt-5" aria-label="School vans" aria-live="polite">
        {vansLoading && <div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center"><p className="text-sm text-slate-600" role="status">Loading vans…</p></div>}

        {!vansLoading && vansError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6"><p className="text-sm font-semibold text-rose-900">Vans could not be loaded</p><p className="mt-1 text-sm text-rose-800" role="alert">{vansError}</p><button type="button" onClick={loadVans} disabled={vansLoading} className="mt-4 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50">Retry van list</button></div>}

        {!vansLoading && !vansError && vans.length === 0 && <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500" aria-hidden="true">▰</span><h2 className="mt-4 text-base font-semibold text-slate-900">No vans yet</h2><p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">Create a van to add it to your school fleet.</p><button type="button" onClick={() => setModalOpen(true)} className="mt-4 text-sm font-semibold text-cyan-800 hover:text-cyan-950">Create your first van</button></div></div>}

        {!vansLoading && !vansError && vans.length > 0 && filteredVans.length === 0 && <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><div><h2 className="text-base font-semibold text-slate-900">No vans match your search</h2><p className="mt-1 text-sm text-slate-600">Try another registration number, driver name, or email.</p></div></div>}

        {!vansLoading && !vansError && filteredVans.length > 0 && <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filteredVans.map((van) => <VanCard key={van._id || `${van.registrationNumber}-${van.assignedDriver}`} van={van} drivers={drivers} driversLoading={driversLoading} updating={updatingVanId === van._id} onReassign={reassignDriver}/>)}</div>}
      </section>

      {modalOpen && <VanFormModal drivers={drivers} driversLoading={driversLoading} driversError={driversError} onRetryDrivers={loadDrivers} onClose={() => setModalOpen(false)} onCreated={loadVans}/>}
    </DashboardLayout>
  );
}
