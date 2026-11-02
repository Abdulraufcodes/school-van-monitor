import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { changePassword } from '../services/auth.service.js';

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setNotice(''); setError('');
    if (password !== confirmPassword) { setError('The new passwords do not match.'); return; }
    setBusy(true);
    try { const result = await changePassword({ currentPassword, password }); setNotice(result.message); setCurrentPassword(''); setPassword(''); setConfirmPassword(''); }
    catch (cause) { setError(cause.response?.data?.message || 'Password could not be updated.'); }
    finally { setBusy(false); }
  }
  return <DashboardLayout title="Change password"><section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h1 className="text-2xl font-semibold">Change password</h1><p className="mt-2 text-sm text-slate-600">Enter your current password and choose a new password with at least 12 characters.</p><form onSubmit={submit} className="mt-6 space-y-4">{[['Current password', currentPassword, setCurrentPassword, 'current-password'], ['New password', password, setPassword, 'new-password'], ['Confirm new password', confirmPassword, setConfirmPassword, 'new-password']].map(([label, value, setter, autocomplete], index) => <label key={label} className="block text-sm font-medium text-slate-700">{label}<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" type="password" required minLength={index ? 12 : 1} maxLength={128} autoComplete={autocomplete} value={value} onChange={(event) => setter(event.target.value)}/></label>)}{error && <p className="text-sm text-rose-800" role="alert">{error}</p>}{notice && <p className="text-sm text-emerald-800" role="status">{notice}</p>}<button disabled={busy} className="rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Update password'}</button></form></section></DashboardLayout>;
}
