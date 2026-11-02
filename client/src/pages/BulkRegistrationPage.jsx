import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { commitRegistrationFile, downloadRegistrationTemplate, previewRegistrationFile } from '../services/schoolPeople.service.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getErrorMessage(error) {
  const previewMessage = error.response?.data?.errors?.find((item) => item.field === 'preview')?.message;
  if (previewMessage) {
    try { return JSON.parse(previewMessage); } catch { /* Use the regular error message. */ }
  }
  return error.response?.data?.message || 'The request could not be completed. Check the file and try again.';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

export function BulkRegistrationPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function selectFile(event) {
    const selected = event.target.files?.[0] || null;
    setFile(selected); setPreview(null); setError(''); setNotice('');
    if (selected && selected.size > MAX_FILE_SIZE) { setError('Choose an Excel file of 5 MB or smaller.'); setFile(null); }
    else if (selected && !/\.xlsx$/i.test(selected.name)) { setError('Choose an .xlsx file.'); setFile(null); }
  }

  async function getPreview() {
    if (!file) return;
    setBusy('preview'); setError(''); setNotice(''); setPreview(null);
    try { setPreview(await previewRegistrationFile(file)); }
    catch (cause) { setError(getErrorMessage(cause)); }
    finally { setBusy(''); }
  }

  async function importAll() {
    if (!file || !preview?.valid) return;
    setBusy('import'); setError(''); setNotice('');
    try {
      const result = await commitRegistrationFile(file);
      setNotice(`Imported ${result.created.parents} parents, ${result.created.drivers} drivers, and ${result.created.students} students.`);
      setFile(null); setPreview(null);
    } catch (cause) {
      const detail = getErrorMessage(cause);
      if (typeof detail === 'object') setPreview(detail);
      else setError(detail);
    } finally { setBusy(''); }
  }

  async function getTemplate() {
    setBusy('template'); setError('');
    try { downloadBlob(await downloadRegistrationTemplate(), 'school-registration-template.xlsx'); }
    catch (cause) { setError(getErrorMessage(cause)); }
    finally { setBusy(''); }
  }

  const errors = preview ? preview.fileErrors.length + preview.rows.reduce((count, row) => count + row.errors.length, 0) : 0;

  return <DashboardLayout title="Bulk registration">
    <section className="mb-6"><p className="text-sm font-medium text-cyan-700">School directory</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Bulk registration</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Upload a school roster, review every validation issue, correct the workbook, and upload it again. Import is enabled only when the complete file is valid.</p></section>
    {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{error}</div>}
    {notice && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-950">1. Prepare the roster</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Use the workbook template. Each row is one student, parent, or driver. Student rows link to parent emails, including parents added elsewhere in the same file.</p></div><button type="button" onClick={getTemplate} disabled={Boolean(busy)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{busy === 'template' ? 'Preparing…' : 'Download Excel template'}</button></div>
      <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-3"><p><strong>Parent/driver:</strong> name, email, and a 12+ character initial password.</p><p><strong>Student:</strong> name and one or more parent emails.</p><p><strong>Whole file:</strong> up to 500 rows and 5 MB; no partial imports.</p></div>
      <div className="mt-6 border-t border-slate-100 pt-5"><h2 className="text-lg font-semibold text-slate-950">2. Upload and validate</h2><div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="block flex-1 text-sm font-medium text-slate-700">Excel workbook<input type="file" accept=".xlsx" onChange={selectFile} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cyan-800"/><span className="mt-1 block text-xs font-normal text-slate-500">Maximum 5 MB. Import revalidates the same workbook before writing.</span></label><button type="button" onClick={getPreview} disabled={!file || Boolean(busy)} className="rounded-xl bg-cyan-700 px-5 py-3 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50">{busy === 'preview' ? 'Checking workbook…' : 'Preview and validate'}</button></div></div>
    </section>

    {preview && <section className="mt-6 space-y-4" aria-live="polite">
      <div className={`rounded-2xl border p-5 ${preview.valid ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className={`text-lg font-semibold ${preview.valid ? 'text-emerald-950' : 'text-amber-950'}`}>{preview.valid ? 'Workbook ready to import' : 'Fix the preview errors before importing'}</h2><p className={`mt-1 text-sm ${preview.valid ? 'text-emerald-800' : 'text-amber-900'}`}>{preview.summary.totalRows} rows checked · {preview.summary.validRows} valid · {preview.summary.errorRows} rows with errors · {errors} total issues</p></div><button type="button" onClick={importAll} disabled={!preview.valid || Boolean(busy)} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy === 'import' ? 'Importing all rows…' : 'Import all rows'}</button></div><p className="mt-3 text-xs text-slate-700">The server checks the uploaded workbook again before writing. If any row fails validation, nothing is imported.</p></div>
      {preview.fileErrors.length > 0 && <div className="rounded-2xl border border-rose-200 bg-white p-5"><h3 className="font-semibold text-rose-900">Workbook columns and file errors</h3><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-rose-800">{preview.fileErrors.map((issue, index) => <li key={`${issue.column}-${index}`}><strong>{issue.column}:</strong> {issue.message}</li>)}</ul></div>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-semibold text-slate-950">Row-by-row preview</h3></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Excel row</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Name / email</th><th className="px-4 py-3">Validation</th></tr></thead><tbody className="divide-y divide-slate-100">{preview.rows.map((row) => <tr key={row.rowNumber} className={row.errors.length ? 'bg-rose-50/60' : ''}><td className="whitespace-nowrap px-4 py-3 font-mono">{row.rowNumber}</td><td className="px-4 py-3 capitalize">{row.recordType || '—'}</td><td className="px-4 py-3"><p className="font-medium text-slate-800">{row.name || '—'}</p><p className="mt-0.5 break-all text-xs text-slate-500">{row.email || row.parentEmails.join(', ') || '—'}</p></td><td className="min-w-72 px-4 py-3">{row.errors.length ? <ul className="space-y-1 text-rose-800">{row.errors.map((issue, index) => <li key={`${issue.column}-${index}`}><strong>{issue.column}:</strong> {issue.message}</li>)}</ul> : <span className="font-medium text-emerald-700">Ready</span>}</td></tr>)}</tbody></table></div></div>
    </section>}
  </DashboardLayout>;
}
