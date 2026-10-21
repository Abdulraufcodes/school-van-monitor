import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-bold">Page not found</h1>
        <Link className="mt-4 inline-block text-cyan-300 underline" to="/">Return home</Link>
      </div>
    </main>
  );
}
