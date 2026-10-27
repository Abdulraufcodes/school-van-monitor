import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '../pages/HomePage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { RoleSelectionPage } from '../pages/RoleSelectionPage.jsx';
import { DriverDashboardPage } from '../pages/DriverDashboardPage.jsx';
import { ParentDashboardPage } from '../pages/ParentDashboardPage.jsx';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/roles" element={<RoleSelectionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['driver']} />}>
          <Route path="/driver/dashboard" element={<DriverDashboardPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
          <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
