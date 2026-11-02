import { DashboardLayout } from '../layouts/DashboardLayout.jsx';

export function ParentDashboardPage() {
  return (
    <DashboardLayout title="Dashboard">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-cyan-700">Family workspace</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Welcome to your dashboard</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Child tracking and activity tools will appear here when parent discovery is available.</p>
      </section>
    </DashboardLayout>
  );
}
