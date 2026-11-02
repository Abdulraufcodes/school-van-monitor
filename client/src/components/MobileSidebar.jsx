import { Sidebar } from './Sidebar.jsx';

export function MobileSidebar({ open, items, roleLabel, onClose, onNavigate }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={`${roleLabel} navigation`}>
      <button type="button" className="absolute inset-0 bg-slate-950/60" onClick={onClose} aria-label="Close navigation" />
      <aside className="absolute inset-y-0 left-0 w-[min(19rem,85vw)] shadow-2xl">
        <Sidebar items={items} roleLabel={roleLabel} mobile onClose={onClose} onNavigate={onNavigate}/>
      </aside>
    </div>
  );
}
