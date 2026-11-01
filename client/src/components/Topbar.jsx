export function Topbar({ title, user, roleLabel, collapsed, onToggleSidebar, onSignOut }) {
  const initial = user?.name?.trim()?.charAt(0)?.toUpperCase() || roleLabel?.charAt(0) || 'U';

  return (
    <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onToggleSidebar} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-600 lg:hidden" aria-label="Open navigation" aria-haspopup="dialog">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/></svg>
        </button>
        <button type="button" onClick={onToggleSidebar} className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-600 lg:grid" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-pressed={collapsed}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16" strokeLinecap="round"/></svg>
        </button>
        <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-500">{roleLabel}</p><h1 className="truncate text-base font-semibold tracking-tight text-slate-950 sm:text-lg">{title}</h1></div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden min-w-0 text-right sm:block"><p className="max-w-40 truncate text-sm font-semibold text-slate-800">{user?.name || 'User'}</p><p className="text-xs text-slate-500">{roleLabel}</p></div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-900 sm:hidden" aria-hidden="true">{initial}</span>
        <button type="button" onClick={onSignOut} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 sm:px-4 sm:text-sm">Sign out</button>
      </div>
    </header>
  );
}
