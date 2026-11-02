import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { MobileSidebar } from '../components/MobileSidebar.jsx';
import { Sidebar } from '../components/Sidebar.jsx';
import { Topbar } from '../components/Topbar.jsx';
import { roleLabels, roleNavigation } from './roleNavigation.js';

export function DashboardLayout({ title, children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const role = user?.role;
  const items = roleNavigation[role] ?? [];
  const roleLabel = roleLabels[role] ?? 'Account';

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block ${collapsed ? 'w-[5.25rem]' : 'w-72'}`}>
        <Sidebar items={items} roleLabel={roleLabel} collapsed={collapsed}/>
      </aside>
      <MobileSidebar open={mobileOpen} items={items} roleLabel={roleLabel} onClose={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)}/>
      <div className={`min-h-screen transition-[padding] duration-200 ${collapsed ? 'lg:pl-[5.25rem]' : 'lg:pl-72'}`}>
        <Topbar title={title} user={user} roleLabel={roleLabel} collapsed={collapsed} onToggleSidebar={() => {
          if (window.matchMedia('(min-width: 1024px)').matches) setCollapsed((value) => !value);
          else setMobileOpen(true);
        }} onSignOut={handleSignOut}/>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
