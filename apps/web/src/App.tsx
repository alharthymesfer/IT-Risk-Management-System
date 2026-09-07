import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireRole } from './auth/RouteGuards';
import { AppLayout } from './components/layout/AppLayout';
import { AssetsPage } from './pages/AssetsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ControlsPage } from './pages/ControlsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RisksPage } from './pages/RisksPage';
import { ThreatsPage } from './pages/ThreatsPage';
import { TreatmentPlansPage } from './pages/TreatmentPlansPage';
import { UsersPage } from './pages/UsersPage';
import { VulnerabilitiesPage } from './pages/VulnerabilitiesPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/risks" element={<RisksPage />} />
          <Route path="/threats" element={<ThreatsPage />} />
          <Route path="/vulnerabilities" element={<VulnerabilitiesPage />} />
          <Route path="/controls" element={<ControlsPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/treatment-plans" element={<TreatmentPlansPage />} />
          <Route
            path="/users"
            element={
              <RequireRole roles={['ADMIN']}>
                <UsersPage />
              </RequireRole>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <RequireRole roles={['ADMIN', 'AUDITOR']}>
                <AuditLogsPage />
              </RequireRole>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
