import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import DashboardHome from './pages/DashboardHome';
import TeamManagement from './pages/TeamManagement';
import WorkflowSettings from './pages/WorkflowSettings';
import NotificationSettings from './pages/NotificationSettings';
import ActivityLog from './pages/ActivityLog';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';

const DashboardLayout = () => (
  <div className="flex h-screen overflow-hidden bg-b24-bg">
    <Sidebar />
    <div className="flex-1 overflow-hidden flex flex-col">
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
          <Route path="settings" element={<WorkflowSettings />} />
          <Route path="notifications" element={<NotificationSettings />} />
          <Route path="activity" element={<ActivityLog />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
