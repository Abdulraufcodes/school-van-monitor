import { Link } from 'react-router-dom';

const options = [
  { title: 'Admin', subtitle: 'School Administrator', description: 'Manage school transport operations and access the admin dashboard.', available: true, icon: '▦' },
  { title: 'Parent', subtitle: 'Family access', description: 'Sign in with your parent account to open the parent dashboard.', available: true, icon: '♡' },
  { title: 'Driver', subtitle: 'Driver access', description: 'Sign in with your driver account to open the driver dashboard.', available: true, icon: '↗' }
];

export function RoleSelectionPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50 px-5 py-12 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-16 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
      <section className="relative w-full max-w-5xl">
        <Link to="/" className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><span aria-hidden="true">←</span> Back to home</Link>
        <div className="mx-auto mt-12 max-w-2xl text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 16V7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V16M3 11h18M6 16v2m12-2v2M3 16h18" strokeLinecap="round" strokeLinejoin="round"/></svg></span><p className="mt-6 text-sm font-bold uppercase tracking-[.17em] text-blue-700">Welcome</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Choose your role</h1><p className="mt-4 text-base leading-7 text-slate-600">Select how you use the School Van Monitoring System.</p></div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">{options.map((option) => {
          const content = <>
            <div className="flex items-start justify-between"><span className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl ${option.available ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`} aria-hidden="true">{option.icon}</span><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${option.available ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{option.available ? 'Available' : 'Coming soon'}</span></div>
            <h2 className="mt-6 text-xl font-bold">{option.title}</h2><p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${option.available ? 'text-blue-700' : 'text-slate-400'}`}>{option.subtitle}</p><p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-600">{option.description}</p>
            <span className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white group-hover:bg-blue-700">Continue to sign in<span aria-hidden="true">→</span></span>
          </>;
          return <Link key={option.title} to="/login" className="group rounded-2xl border border-blue-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">{content}</Link>;
        })}</div>
        <p className="mt-8 text-center text-xs text-slate-500">Your account role is assigned by the system. Choosing a card does not change your role.</p>
      </section>
    </main>
  );
}
