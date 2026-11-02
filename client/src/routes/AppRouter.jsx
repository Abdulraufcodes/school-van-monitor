import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '../pages/HomePage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { RoleSelectionPage } from '../pages/RoleSelectionPage.jsx';
import { DriverDashboardPage } from '../pages/DriverDashboardPage.jsx';
import { ParentDashboardPage } from '../pages/ParentDashboardPage.jsx';
import { VansPage } from '../pages/VansPage.jsx';
import { LiveTrackingPage } from '../pages/LiveTrackingPage.jsx';
import { DriversPage } from '../pages/DriversPage.jsx';
import { StudentActivityPage } from '../pages/StudentActivityPage.jsx';
import { PeoplePage } from '../pages/PeoplePage.jsx';
import { BulkRegistrationPage } from '../pages/BulkRegistrationPage.jsx';
import { ParentLiveTrackingPage } from '../pages/ParentLiveTrackingPage.jsx';
import { ParentActivityHistoryPage } from '../pages/ParentActivityHistoryPage.jsx';
import { AccountLinkPage } from '../pages/AccountLinkPage.jsx';
import { ChangePasswordPage } from '../pages/ChangePasswordPage.jsx';
import { AlertSettingsPage } from '../pages/AlertSettingsPage.jsx';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/roles" element={<RoleSelectionPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account/activate" element={<AccountLinkPage />} />
        <Route path="/account/reset-password" element={<AccountLinkPage />} />
        <Route path="/forgot-password" element={<AccountLinkPage />} />
        <Route element={<ProtectedRoute allowedRoles={['admin', 'driver', 'parent']} />}><Route path="/account/password" element={<ChangePasswordPage />} /></Route>
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/vans" element={<VansPage />} />
          <Route path="/dashboard/live-tracking" element={<LiveTrackingPage />} />
          <Route path="/dashboard/drivers" element={<DriversPage />} />
          <Route path="/dashboard/student-activity" element={<StudentActivityPage />} />
          <Route path="/dashboard/people" element={<PeoplePage />} />
          <Route path="/dashboard/import" element={<BulkRegistrationPage />} />
          <Route path="/dashboard/alert-settings" element={<AlertSettingsPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['driver']} />}>
          <Route path="/driver/dashboard" element={<DriverDashboardPage />} />
          <Route path="/driver/trip" element={<DriverDashboardPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
          <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
          <Route path="/parent/live-tracking" element={<ParentLiveTrackingPage />} />
          <Route path="/parent/activity-history" element={<ParentActivityHistoryPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
