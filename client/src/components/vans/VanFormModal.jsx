import { useEffect, useState } from 'react';
import { createVan } from '../../services/van.service.js';
import { validateVanForm } from '../../utils/vanManagement.js';

function getSubmissionError(error) {
  const code = error.response?.data?.code;
  if (code === 'INVALID_DRIVER') {
    return 'That driver is no longer eligible for this school. Refresh the driver list and try again.';
  }
  if (code === 'VAN_ALREADY_EXISTS') {
    return error.response?.data?.message || 'A van with this registration number already exists.';
  }
  return error.response?.data?.message || 'Could not create the van. Check your connection and try again.';
}

export function VanFormModal({
  drivers,
  driversLoading,
  driversError,
  onRetryDrivers,
  onClose,
  onCreated
}) {
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [assignedDriver, setAssignedDriver] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hasDrivers = drivers.length > 0;
  const canSubmit = hasDrivers && !driversLoading && !driversError && !submitting;

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    const result = validateVanForm({ registrationNumber, assignedDriver }, drivers);
    setFieldErrors(result.errors);
    if (Object.keys(result.errors).length || !canSubmit) return;

    setSubmitting(true);
    try {
      await createVan(result.payload);
      await onCreated();
      onClose();
    } catch (error) {
      setSubmitError(getSubmissionError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-slate-950/60 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="create-van-title" className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-sm font-medium text-cyan-700">Fleet management</p><h2 id="create-van-title" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Create a van</h2><p className="mt-2 text-sm leading-5 text-slate-500">Add a registration number and assign an active school driver.</p></div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:opacity-50"><span aria-hidden="true">×</span></button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="van-registration" className="mb-2 block text-sm font-medium text-slate-800">Registration number</label>
            <input
              id="van-registration"
              name="registrationNumber"
              value={registrationNumber}
              onChange={(event) => {
                setRegistrationNumber(event.target.value);
                setFieldErrors((current) => ({ ...current, registrationNumber: undefined }));
              }}
              maxLength={100}
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.registrationNumber)}
              aria-describedby={fieldErrors.registrationNumber ? 'van-registration-error' : 'van-registration-help'}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15 aria-[invalid=true]:border-rose-400"
            />
            {fieldErrors.registrationNumber
              ? <p id="van-registration-error" className="mt-1.5 text-xs text-rose-700" role="alert">{fieldErrors.registrationNumber}</p>
              : <p id="van-registration-help" className="mt-1.5 text-xs text-slate-500">Up to 20 characters; spaces are trimmed and letters are uppercased.</p>}
          </div>

          <div>
            <label htmlFor="van-driver" className="mb-2 block text-sm font-medium text-slate-800">Assigned driver</label>
            <select
              id="van-driver"
              name="assignedDriver"
              value={assignedDriver}
              onChange={(event) => {
                setAssignedDriver(event.target.value);
                setFieldErrors((current) => ({ ...current, assignedDriver: undefined }));
              }}
              disabled={driversLoading || Boolean(driversError) || !hasDrivers || submitting}
              aria-invalid={Boolean(fieldErrors.assignedDriver)}
              aria-describedby={fieldErrors.assignedDriver ? 'van-driver-error' : 'van-driver-help'}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15 disabled:bg-slate-100 disabled:text-slate-500 aria-[invalid=true]:border-rose-400"
            >
              <option value="">{driversLoading ? 'Loading active drivers…' : 'Select a driver'}</option>
              {drivers.map((driver) => <option key={driver._id} value={driver._id}>{driver.name} · {driver.email}</option>)}
            </select>
            {fieldErrors.assignedDriver
              ? <p id="van-driver-error" className="mt-1.5 text-xs text-rose-700" role="alert">{fieldErrors.assignedDriver}</p>
              : <p id="van-driver-help" className="mt-1.5 text-xs text-slate-500">Only active drivers for your school are listed.</p>}
          </div>

          {driversError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5" role="alert"><p className="text-sm text-rose-800">{driversError}</p><button type="button" onClick={onRetryDrivers} className="mt-2 text-sm font-semibold text-rose-800 underline underline-offset-2">Retry driver list</button></div>}
          {!driversLoading && !driversError && !hasDrivers && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm leading-5 text-amber-900">An active driver must be available in your school before you can create a van.</p>}
          {submitError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm leading-5 text-rose-800" role="alert">{submitError}</p>}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={!canSubmit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"/>}
              {submitting ? 'Creating…' : 'Create Van'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
