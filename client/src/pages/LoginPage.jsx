import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLoginErrorMessage, login } from '../services/auth.service.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getRoleHomePath } from '../routes/roleAccess.js';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signedInUser, setSignedInUser] = useState(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSignedInUser(null);
    setLoading(true);

    try {
      const result = await login({ email: email.trim(), password });
      if (!result?.success || !result.data?.accessToken || !result.data?.user) {
        setError('The server returned an incomplete login response. Please try again.');
        return;
      }

      const destination = getRoleHomePath(result.data.user.role);
      if (!destination) {
        setError('This account role is not supported. Please contact your administrator.');
        return;
      }
      if (!signIn(result.data)) {
        setError('Your browser could not save this tab session. Enable session storage and try again.');
        return;
      }
      setSignedInUser(result.data.user);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(getLoginErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/30 backdrop-blur sm:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-cyan-500/15 via-slate-900 to-blue-600/15 p-10 sm:flex lg:p-14">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 16V7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V16M4 12h16M7 16v2m10-2v2M7.5 9h.01M16.5 9h.01M4 16h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">School Van Monitor</p>
            <h1 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">A clearer view of every school journey.</h1>
            <p className="mt-5 max-w-sm leading-7 text-slate-300">Sign in to manage your school’s transport operations and keep daily trips in view.</p>
          </div>
          <p className="text-xs text-slate-500">Secure access for school administrators, drivers, and parents</p>
        </div>

        <div className="p-6 sm:p-10 lg:p-14">
          <div className="mb-8 sm:hidden">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">School Van Monitor</p>
          </div>
          <div>
            <p className="text-sm font-medium text-cyan-300">Secure sign-in</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Enter your account details to continue.</p>
          </div>

          {signedInUser ? (
            <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5" role="status">
              <h3 className="font-semibold text-emerald-200">You’re signed in</h3>
              <p className="mt-2 text-sm text-slate-200">Welcome, {signedInUser.name}.</p>
              <p className="mt-1 text-sm text-slate-400">Your session lasts for this browser tab and ends when you sign out or the access token expires.</p>
            </div>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@school.edu"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 pr-20 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-3 my-auto h-9 rounded-lg px-2 text-xs font-semibold text-slate-400 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-5 text-rose-200" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              <p className="text-center text-xs leading-5 text-slate-500">Your dashboard is selected from the role assigned to your account.</p>
            </form>
          )}

          <div className="mt-8 border-t border-slate-800 pt-5 text-center text-sm text-slate-500">
            <Link to="/" className="font-medium text-slate-400 transition hover:text-cyan-200">Back to home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
