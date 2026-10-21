import { useEffect, useState } from 'react';
import { getHealth } from '../services/health.service.js';

export function HomePage() {
  const [health, setHealth] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    getHealth()
      .then((data) => setHealth({ loading: false, data, error: null }))
      .catch(() => setHealth({ loading: false, data: null, error: 'API not reachable. Start the backend on port 5000.' }));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Project starter</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">School Van Monitor</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          A role-based platform for trip visibility, live van location and student pickup/drop-off updates.
        </p>
        <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="font-semibold">Backend health</h2>
          {health.loading && <p className="mt-2 text-slate-300">Checking API…</p>}
          {health.data && <p className="mt-2 text-emerald-300">Connected: {health.data.data.status}</p>}
          {health.error && <p className="mt-2 text-amber-300">{health.error}</p>}
        </div>
        <p className="mt-8 text-sm text-slate-400">
          Starter UI only — read README.md and docs/ before implementing a feature.
        </p>
      </section>
    </main>
  );
}
