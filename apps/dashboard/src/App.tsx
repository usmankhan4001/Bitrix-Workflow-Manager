import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import DashboardHome from './pages/DashboardHome';
import TeamManagement from './pages/TeamManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';

const DashboardLayout = () => (
  <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--b24-bg)' }}>
    <Sidebar />
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Outlet />
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="team" element={<TeamManagement />} />
          <Route path="settings" element={<Settings />} />
          {/* Legacy redirects */}
          <Route path="notifications" element={<Navigate to="/dashboard/settings" replace />} />
          <Route path="activity" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
