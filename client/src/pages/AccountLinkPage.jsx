import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { activateAccount, requestPasswordReset, resetPassword } from '../services/auth.service.js';

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/15';

export function AccountLinkPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activation = location.pathname === '/account/activate';
  const reset = location.pathname === '/account/reset-password';
  const token = new URLSearchParams(location.search).get('token') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault(); setError(''); setNotice('');
    if ((activation || reset) && password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      if (activation) { await activateAccount({ token, password }); setNotice('Your account is active. You can now sign in.'); }
      else if (reset) { await resetPassword({ token, password }); setNotice('Your password was updated. You can sign in with the new password.'); }
      else { const result = await requestPasswordReset(email.trim()); setNotice(result.message); }
    } catch (cause) { setError(cause.response?.data?.message || 'The request could not be completed.'); }
    finally { setBusy(false); }
  }

  const title = activation ? 'Activate your account' : reset ? 'Choose a new password' : 'Reset your password';
  return <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9"><p className="text-sm font-semibold uppercase tracking-wider text-cyan-700">School Van Monitor</p><h1 className="mt-3 text-2xl font-semibold text-slate-950">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{activation ? 'Set a password to activate the account created by your school. This link expires after 3 days and can only be used once.' : reset ? 'Choose a new password. This link can only be used once.' : 'Enter your account email. If it matches an active account, we will send a password reset link.'}</p>
    <form className="mt-6 space-y-4" onSubmit={submit}>
      {!activation && !reset && <label className="block text-sm font-medium text-slate-700">Email address<input className={`${inputClass} mt-1`} type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}/></label>}
      {(activation || reset) && <><label className="block text-sm font-medium text-slate-700">New password<input className={`${inputClass} mt-1`} type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)}/><span className="mt-1 block text-xs font-normal text-slate-500">Use at least 12 characters.</span></label><label className="block text-sm font-medium text-slate-700">Confirm password<input className={`${inputClass} mt-1`} type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}/></label></>}
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}{notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
      <button disabled={busy || ((activation || reset) && !token)} className="w-full rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Please wait…' : activation ? 'Activate account' : reset ? 'Save new password' : 'Send reset link'}</button>
      {(activation || reset) && !token && <p className="text-sm text-rose-700">This link is missing its token. Ask your school to resend it or request a new reset link.</p>}
    </form><p className="mt-6 text-center text-sm text-slate-600"><Link className="font-semibold text-cyan-800 hover:underline" to="/login" onClick={() => { if (notice && (activation || reset)) navigate('/login'); }}>Back to sign in</Link></p></section></main>;
}
