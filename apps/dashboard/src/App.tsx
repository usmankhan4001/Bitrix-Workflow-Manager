import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import DashboardHome from './pages/DashboardHome';
import Assignment from './pages/Assignment';
import AssignmentLog from './pages/AssignmentLog';
import Rotations from './pages/Rotations';
import Duplicates from './pages/Duplicates';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import { initBX24 } from './lib/bx24';
import { ThemeProvider } from './lib/theme';

const DashboardLayout = () => (
  <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--b24-bg)' }}>
    <Sidebar />
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Outlet />
    </div>
  </div>
);

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initBX24().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--b24-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--b24-text-muted)', fontSize: 13 }}>
          <svg className="b24-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--b24-primary)" strokeWidth="3" strokeOpacity="0.2" />
            <path fill="var(--b24-primary)" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
    <Router>
      <Routes>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="assignment" element={<Assignment />} />
          <Route path="assignment-log" element={<AssignmentLog />} />
          <Route path="rotations" element={<Rotations />} />
          <Route path="duplicates" element={<Duplicates />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          {/* Legacy redirects */}
          <Route path="team" element={<Navigate to="/dashboard/assignment" replace />} />
          <Route path="activity" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
    </ThemeProvider>
  );
}

export default App;
