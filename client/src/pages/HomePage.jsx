import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHealth } from '../services/health.service.js';

const sections = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Who It Helps', href: '#who-it-helps' },
  { label: 'About', href: '#about' }
];

const features = [
  { number: '01', title: 'Van location visibility', description: 'A clearer view of a school van’s journey, shared with the people who are authorized to see it.', icon: '⌖' },
  { number: '02', title: 'Pickup-point proximity alerts', description: 'Helpful arrival updates can let families prepare when a van is approaching a pickup point.', icon: '◉' },
  { number: '03', title: 'Pickup and drop-off status', description: 'A simple way to keep families informed when a student boards or leaves the van.', icon: '↔' },
  { number: '04', title: 'Timestamped trip records', description: 'A useful record of transportation updates, with time details to support clear communication.', icon: '▤' }
];

const roles = [
  { title: 'Parents', description: 'See relevant updates about linked students and their school journeys when parent features are available.', icon: '♡', tone: 'bg-rose-50 text-rose-700' },
  { title: 'Drivers', description: 'Share trip updates and student pickup or drop-off status through a practical mobile workflow.', icon: '↗', tone: 'bg-sky-50 text-sky-700' },
  { title: 'School Administrators', description: 'Coordinate school transport operations and keep important trip information organized.', icon: '▦', tone: 'bg-indigo-50 text-indigo-700' }
];

function VanIllustration() {
  return (
    <svg viewBox="0 0 620 430" role="img" aria-labelledby="van-title van-desc" className="h-auto w-full max-w-[600px]">
      <title id="van-title">Illustration of a school van on its route</title>
      <desc id="van-desc">A friendly blue and white school van on a road, with a route line and location pin.</desc>
      <defs>
        <linearGradient id="van-sky" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#EAF7FF"/><stop offset="1" stopColor="#DCEEFF"/></linearGradient>
        <linearGradient id="van-body" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#48A8EF"/><stop offset="1" stopColor="#1874CA"/></linearGradient>
      </defs>
      <rect x="20" y="20" width="580" height="390" rx="42" fill="url(#van-sky)"/>
      <circle cx="500" cy="105" r="48" fill="#FFF" opacity=".85"/>
      <path d="M58 306c88-42 148-30 214 7 54 30 95 28 148-3 51-29 97-34 149-10v80H58z" fill="#D3E9FA"/>
      <path d="M74 330c98-48 157-34 221 2 61 34 105 36 165 3 52-28 88-31 133-13" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeDasharray="3 20"/>
      <path d="M118 265h46l37-67c8-14 23-23 39-23h140c18 0 35 8 46 22l45 59h27c17 0 31 14 31 31v41H106v-35c0-15 5-28 12-28" fill="url(#van-body)"/>
      <path d="m213 198-32 58h95v-69h-37c-11 0-21 4-26 11" fill="#E9F7FF"/>
      <path d="M290 187v69h112l-38-50c-9-12-23-19-38-19z" fill="#E9F7FF"/>
      <path d="M207 270h173" stroke="#BDE5FF" strokeWidth="4" strokeLinecap="round"/>
      <rect x="133" y="270" width="32" height="14" rx="7" fill="#FFF" opacity=".9"/>
      <path d="M253 291h76" stroke="#FFF" strokeWidth="8" strokeLinecap="round" opacity=".9"/>
      <circle cx="211" cy="324" r="31" fill="#143451"/><circle cx="211" cy="324" r="15" fill="#D9ECF9"/>
      <circle cx="437" cy="324" r="31" fill="#143451"/><circle cx="437" cy="324" r="15" fill="#D9ECF9"/>
      <path d="M447 96c0-24 19-43 43-43s43 19 43 43c0 30-43 73-43 73s-43-43-43-73" fill="#2563EB"/>
      <circle cx="490" cy="96" r="14" fill="#FFF"/>
      <path d="M67 150c23-20 45-20 68 0M83 171c13-11 24-11 37 0" fill="none" stroke="#9CCCED" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="91" cy="192" r="5" fill="#7AB9E3"/><circle cx="116" cy="213" r="4" fill="#7AB9E3"/>
    </svg>
  );
}

function Brand({ inverse = false }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${inverse ? 'text-white focus:ring-offset-slate-950' : 'text-slate-900'}`} aria-label="School Van Monitoring System home">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 16V7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V16M3 11h18M6 16v2m12-2v2M3 16h18M7 8.5h.01M17 8.5h.01" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="17" r="1" fill="currentColor"/><circle cx="17" cy="17" r="1" fill="currentColor"/></svg>
      </span>
      <span className="leading-tight"><span className="block text-sm font-bold tracking-tight sm:text-base">School Van</span><span className={`block text-[10px] font-semibold uppercase tracking-[.18em] ${inverse ? 'text-slate-400' : 'text-slate-500'}`}>Monitoring System</span></span>
    </Link>
  );
}

export function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [health, setHealth] = useState({ status: 'loading', message: '' });

  useEffect(() => {
    let active = true;
    getHealth()
      .then((data) => {
        if (active) setHealth(data?.success && data.data?.status === 'ok'
          ? { status: 'connected', message: 'Service is responding' }
          : { status: 'error', message: 'Unexpected health response' });
      })
      .catch(() => { if (active) setHealth({ status: 'error', message: 'Service status is unavailable' }); });
    return () => { active = false; };
  }, []);

  return (
    <div className="scroll-smooth bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Main navigation">
          <Brand />
          <div className="hidden items-center gap-7 lg:flex">
            {sections.map((section) => <a key={section.href} href={section.href} className="rounded py-2 text-sm font-medium text-slate-600 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">{section.label}</a>)}
            <Link to="/roles" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Login</Link>
          </div>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>
            <span className="text-2xl leading-none" aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
          </button>
        </nav>
        {menuOpen && <div id="mobile-navigation" className="border-t border-slate-100 bg-white px-5 py-4 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {sections.map((section) => <a key={section.href} href={section.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">{section.label}</a>)}
            <Link to="/roles" onClick={() => setMenuOpen(false)} className="mt-2 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Login</Link>
          </div>
        </div>}
      </header>

      <main>
        <section id="home" className="scroll-mt-24 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50">
          <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1.05fr_.95fr] md:py-20">
            <div className="relative z-10">
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm"><span className="h-2 w-2 rounded-full bg-blue-500"/>A more connected school day</p>
              <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.65rem]">Every School Journey,<br className="hidden sm:block"/> More Visible and Safer.</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">A school transport platform designed to bring drivers, families, and school teams closer to the information that matters during a journey.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Explore Features <span aria-hidden="true">↓</span></a>
                <Link to="/roles" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Choose your role</Link>
              </div>
              <p className="mt-5 text-xs leading-5 text-slate-500">Tracking, alerts, and family-facing workflows are planned capabilities and are not yet available.</p>
            </div>
            <div className="relative mx-auto w-full max-w-[590px] md:translate-x-3"><div className="absolute inset-12 rounded-full bg-blue-200/40 blur-3xl"/><div className="relative"><VanIllustration /></div><div className="absolute bottom-5 left-2 hidden items-center gap-3 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-lg sm:flex"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700" aria-hidden="true">⌖</span><span><span className="block text-xs font-semibold text-slate-800">A journey with more clarity</span><span className="block text-[11px] text-slate-500">Designed for school communities</span></span></div></div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.17em] text-blue-700">Designed for the school journey</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The details that bring peace of mind</h2><p className="mt-4 leading-7 text-slate-600">A set of intended tools to make everyday school transportation easier to follow and communicate.</p></div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{features.map((feature) => <article key={feature.number} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-2xl text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white" aria-hidden="true">{feature.icon}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Planned</span></div><p className="mt-6 text-xs font-bold tracking-widest text-blue-600">{feature.number}</p><h3 className="mt-2 text-lg font-semibold tracking-tight">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p></article>)}</div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-slate-50 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-[.17em] text-blue-700">How it works</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A thoughtful flow from road to home</h2><p className="mt-4 leading-7 text-slate-600">The planned workflow keeps transportation updates connected to the people they’re meant to help.</p></div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">{[
              { n: '01', title: 'Driver shares an update', body: 'A driver can provide a van location and student transportation status as part of a trip.', icon: '↗' },
              { n: '02', title: 'Updates are checked', body: 'The service is designed to process updates with role, assignment, and trip context.', icon: '✓' },
              { n: '03', title: 'Families get relevant information', body: 'Parents will be able to view information for students linked to their account when those features are implemented.', icon: '♡' }
            ].map((step) => <article key={step.n} className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><span className="absolute right-6 top-6 text-xs font-bold tracking-widest text-blue-300">{step.n}</span><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-xl text-white" aria-hidden="true">{step.icon}</span><h3 className="mt-6 text-lg font-semibold">{step.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{step.body}</p></article>)}</div>
            <p className="mt-6 text-center text-xs text-slate-500">Driver location submission exists in the backend; parent views, alerts, and student event workflows are not yet implemented.</p>
          </div>
        </section>

        <section id="who-it-helps" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[.17em] text-blue-700">Who it helps</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">One journey, different perspectives</h2></div><p className="max-w-lg text-sm leading-6 text-slate-600">Each role has a distinct part in making school transportation more coordinated and transparent.</p></div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">{roles.map((role) => <article key={role.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><span className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl ${role.tone}`} aria-hidden="true">{role.icon}</span><h3 className="mt-5 text-xl font-semibold">{role.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{role.description}</p></article>)}</div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-24">
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-3xl bg-blue-700 text-white md:grid-cols-[.85fr_1.15fr]">
            <div className="relative min-h-64 overflow-hidden bg-blue-800 p-8 sm:p-10"><div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border-[24px] border-blue-600/60"/><div className="relative"><p className="text-sm font-bold uppercase tracking-[.17em] text-blue-200">Safety & transparency</p><h2 className="mt-4 max-w-sm text-3xl font-bold leading-tight">The right information, for the right people.</h2></div><div className="absolute bottom-0 right-5 w-44 opacity-60 sm:w-56"><VanIllustration /></div></div>
            <div className="grid gap-6 p-8 sm:grid-cols-2 sm:p-10">{[
              { title: 'Role-aware access', body: 'The application is designed around distinct roles. Implemented API actions enforce authentication, role, and assignment checks on the server.' },
              { title: 'Relevant visibility', body: 'Parent-facing information is intended to be limited to linked students; those parent workflows are still planned.' },
              { title: 'Clear records', body: 'Transportation records are intended to include timestamps that make updates easier to understand.' },
              { title: 'Honest status', body: 'This site identifies planned tools clearly so families and schools know what is available today.' }
            ].map((item) => <div key={item.title} className="border-l-2 border-cyan-300 pl-4"><h3 className="font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-blue-100">{item.body}</p></div>)}</div>
          </div>
        </section>

        <section id="about" className="scroll-mt-24 bg-blue-50 px-5 py-20 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[.8fr_1.2fr] md:items-center">
            <div><p className="text-sm font-bold uppercase tracking-[.17em] text-blue-700">About the project</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Better informed journeys, built for real school days.</h2></div>
            <div><p className="text-base leading-8 text-slate-700">The School Van Monitoring System is being built to make school transportation safer and more transparent for parents, drivers, and school teams. Its design prioritizes clear information, mobile-friendly use, and practical workflows for schools that may have unreliable internet connectivity.</p><p className="mt-4 text-sm leading-6 text-slate-600">Connectivity support is a design goal; offline operation is not currently promised.</p></div>
          </div>
        </section>

        <section className="border-t border-slate-100 bg-white px-5 py-5 sm:px-8" aria-label="Service status">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-xs text-slate-500" role="status"><span className={`h-2 w-2 rounded-full ${health.status === 'connected' ? 'bg-emerald-500' : health.status === 'error' ? 'bg-amber-500' : 'animate-pulse bg-slate-300'}`} />{health.status === 'connected' ? 'Service status: connected' : health.status === 'error' ? 'Service status: unavailable' : 'Checking service status'}</div>
        </section>
      </main>

      <footer className="bg-slate-950 px-5 py-10 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between"><div><Brand inverse /><p className="mt-4 max-w-sm text-xs leading-5 text-slate-400">Safer, more transparent school transportation for every school community.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-300">{sections.map((section) => <a key={section.href} href={section.href} className="rounded hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400">{section.label}</a>)}<Link to="/roles" className="rounded hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400">Login</Link></nav></div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-5 text-xs text-slate-500">© {new Date().getFullYear()} School Van Monitoring System</div>
      </footer>
    </div>
  );
}
