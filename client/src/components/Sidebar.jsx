import { NavLink } from 'react-router-dom';

function NavigationIcon({ name }) {
  const paths = {
    Overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    Dashboard: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></>,
    Vans: <><path d="M3 7h12v11H3zM15 11h4l2 3v4h-6"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></>,
    'Live Tracking': <><circle cx="12" cy="10" r="3"/><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/></>,
    Students: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1"/></>,
    Drivers: <><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0M12 11v5m-3-3h6"/></>,
    Parents: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20a6 6 0 0 1 12 0m1-5a5 5 0 0 1 5 5"/></>,
    People: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1"/></>,
    Reports: <><path d="M5 3h10l4 4v14H5zM15 3v5h4M8 12h8m-8 4h8"/></>,
    'My Trip': <><path d="M3 12h18M12 3l9 9-9 9"/><circle cx="5" cy="12" r="2"/></>,
    'Student Roster': <><path d="M8 6h13M8 12h13M8 18h13"/><path d="m3 6 1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2"/></>,
    'Trip History': <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2M3 4v4h4"/></>,
    'Activity History': <><path d="M4 5h16M4 12h10M4 19h7"/><circle cx="18" cy="16" r="3"/><path d="M18 14v2l1 1"/></>
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      {paths[name] ?? paths.Overview}
    </svg>
  );
}

export function Sidebar({ items, roleLabel, collapsed = false, onNavigate, mobile = false, onClose }) {
  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className={`flex h-[76px] shrink-0 items-center border-b border-white/10 ${collapsed && !mobile ? 'justify-center px-3' : 'gap-3 px-5'}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300 text-slate-950" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><path d="M3 16V7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5V16M3 11h18M6 16v2m12-2v2M3 16h18" strokeLinecap="round" strokeLinejoin="round"/><circle cx="7" cy="17" r="1" fill="currentColor"/><circle cx="17" cy="17" r="1" fill="currentColor"/></svg>
        </span>
        {(!collapsed || mobile) && <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold tracking-tight">School Van</p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Monitoring · {roleLabel}</p></div>}
        {mobile && <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300" aria-label="Close navigation"><span aria-hidden="true">×</span></button>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6" aria-label={`${roleLabel} navigation`}>
        {(!collapsed || mobile) && <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>}
        {items.map((navItem) => navItem.comingSoon ? (
          <div key={navItem.label} aria-disabled="true" title={`${navItem.label} is coming soon`} className={`flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 ${collapsed && !mobile ? 'justify-center' : ''}`}>
            <NavigationIcon name={navItem.label}/>
            {(!collapsed || mobile) && <><span className="min-w-0 flex-1 truncate">{navItem.label}</span><span className="whitespace-nowrap rounded-md bg-white/5 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">Coming Soon</span></>}
            {collapsed && !mobile && <span className="sr-only">{navItem.label}, coming soon</span>}
          </div>
        ) : (
          <NavLink
            key={navItem.label}
            to={navItem.to}
            end
            title={collapsed && !mobile ? navItem.label : undefined}
            onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-300 ${collapsed && !mobile ? 'justify-center' : ''} ${isActive ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
          >
            <NavigationIcon name={navItem.label}/>
            {(!collapsed || mobile) && <span className="truncate">{navItem.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className={`border-t border-white/10 px-4 py-4 text-xs text-slate-500 ${collapsed && !mobile ? 'text-center' : ''}`}>
        {collapsed && !mobile ? 'SVM' : 'School Van Monitoring'}
      </div>
    </div>
  );
}
