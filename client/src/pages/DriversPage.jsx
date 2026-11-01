import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { getDrivers } from '../services/driver.service.js';

function getLoadError(error) {
  return error.response?.data?.message || (error.request
    ? 'Could not reach the server. Check your connection and try again.'
    : 'Active drivers could not be loaded.');
}

export function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDrivers(await getDrivers());
    } catch (caught) {
      setError(getLoadError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDrivers(); }, [loadDrivers]);

  return (
    <DashboardLayout title="Drivers">
      <header className="mb-6">
        <p className="text-sm font-medium text-cyan-700">School directory</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Drivers</h1>
        <p className="mt-2 text-sm text-slate-600">Active drivers associated with your school.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-labelledby="driver-list-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div><h2 id="driver-list-heading" className="font-semibold text-slate-950">Driver directory</h2><p className="mt-1 text-sm text-slate-500">The current API supports listing active drivers.</p></div>
        </div>

        {loading && <p className="py-10 text-center text-sm text-slate-600" role="status">Loading drivers…</p>}
        {!loading && error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm text-rose-800" role="alert">{error}</p><button type="button" onClick={() => void loadDrivers()} className="mt-3 min-h-10 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100">Try again</button></div>}
        {!loading && !error && drivers.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">No active drivers are available for this school.</p>}
        {!loading && !error && drivers.length > 0 && <>
          <div className="mt-4 space-y-3 md:hidden">
            {drivers.map((driver) => <article key={driver._id} className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900">{driver.name}</h3><p className="mt-1 break-all text-sm text-slate-600">{driver.email}</p><span className="mt-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Active</span></article>)}
          </div>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3 font-semibold">Name</th><th className="px-3 py-3 font-semibold">Email</th><th className="px-3 py-3 font-semibold">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{drivers.map((driver) => <tr key={driver._id}><td className="px-3 py-4 font-medium text-slate-900">{driver.name}</td><td className="px-3 py-4 text-slate-600">{driver.email}</td><td className="px-3 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Active</span></td></tr>)}</tbody>
            </table>
          </div>
        </>}
      </section>
      <p className="mt-4 text-sm text-slate-500">Creating, editing, deactivating, deleting, and assigning drivers are unavailable because no corresponding admin endpoints are implemented.</p>
    </DashboardLayout>
  );
}
