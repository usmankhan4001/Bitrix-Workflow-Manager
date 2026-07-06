import React, { useState, useEffect } from 'react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

/* ── Stat card — matches B24PageCard tinted-alt in HomeStats.vue ── */
const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  color: string;
  ringColor: string;
  bgColor: string;
  icon: React.ReactNode;
  badge?: { text: string; type: 'success' | 'warning' | 'neutral' | 'primary' };
}> = ({ label, value, color, ringColor, bgColor, icon, badge }) => (
  <div className="b24-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      {/* Icon — rounded-full bg-primary/10 ring ring-inset ring-primary/25 */}
      <div
        className="b24-stat-icon"
        style={{ background: bgColor, boxShadow: `inset 0 0 0 1.5px ${ringColor}` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      {badge && (
        <span className={`b24-badge b24-badge-${badge.type}`} style={{ fontSize: 10 }}>
          {badge.text}
        </span>
      )}
    </div>
    <div>
      <div className="b24-label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="b24-legend">{value}</div>
    </div>
  </div>
);

/* ── Empty state ── */
const EmptyState: React.FC<{ icon: React.ReactNode; title: string; sub: string }> = ({ icon, title, sub }) => (
  <div style={{ padding: '48px 20px', textAlign: 'center' }}>
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', background: 'var(--b24-card-alt)', marginBottom: 12 }}>
      {icon}
    </div>
    <p style={{ fontWeight: 600, color: 'var(--b24-text)', marginBottom: 4 }}>{title}</p>
    <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>{sub}</p>
  </div>
);

const DashboardHome: React.FC = () => {
  const [lateLeads, setLateLeads] = useState<any[]>([]);
  const [assignedToday, setAssignedToday] = useState(0);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const apiUrl = API();
      const [leadsRes, todayRes, logsRes] = await Promise.all([
        fetch(`${apiUrl}/api/workflow/late-leads`),
        fetch(`${apiUrl}/api/workflow/assigned-today`),
        fetch(`${apiUrl}/api/workflow/assignment-log?limit=10`),
      ]);
      if (leadsRes.ok) setLateLeads(await leadsRes.json());
      if (todayRes.ok) setAssignedToday(await todayRes.json());
      if (logsRes.ok) setRecentLogs(await logsRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const forceAssign = async (leadId: string) => {
    setAssigning(leadId);
    try {
      const apiUrl = API();
      const token = localStorage.getItem('bitrix_access_token');
      const domain = localStorage.getItem('bitrix_domain');
      await fetch(`${apiUrl}/api/workflow/assign-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, team: 'Sales Executives', access_token: token, domain }),
      });
      await fetchData();
    } catch (e) { console.error(e); }
    finally { setAssigning(null); }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--b24-bg)' }}>

      {/* Navbar — matches B24DashboardNavbar */}
      <div className="b24-navbar">
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--b24-text)' }}>Dashboard</h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="b24-btn b24-btn-secondary"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className={loading ? 'b24-spin' : ''}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing…' : 'Reload'}
        </button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stats grid — matches B24PageGrid lg:grid-cols-4 in HomeStats.vue */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <StatCard
            label="Pending in Queue"
            value={loading ? '—' : lateLeads.length}
            color="var(--b24-orange)"
            ringColor="var(--b24-orange-ring)"
            bgColor="var(--b24-orange-bg)"
            icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            badge={lateLeads.length > 0 ? { text: 'Needs action', type: 'warning' } : undefined}
          />
          <StatCard
            label="Assigned Today"
            value={loading ? '—' : assignedToday}
            color="var(--b24-primary)"
            ringColor="var(--b24-primary-ring)"
            bgColor="var(--b24-primary-bg)"
            icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            badge={{ text: 'Today', type: 'neutral' }}
          />
          <StatCard
            label="Distribution"
            value="Active"
            color="var(--b24-green)"
            ringColor="var(--b24-green-ring)"
            bgColor="var(--b24-green-bg)"
            icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            badge={{ text: 'Running', type: 'success' }}
          />
          <StatCard
            label="Recent Assignments"
            value={loading ? '—' : recentLogs.length}
            color="var(--b24-text-muted)"
            ringColor="rgba(107,122,141,0.18)"
            bgColor="rgba(107,122,141,0.08)"
            icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            badge={{ text: 'Last 10', type: 'neutral' }}
          />
        </div>

        {/* Live Queue — main content like HomeSales table */}
        <div className="b24-card">
          {/* Section header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--b24-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--b24-text)', marginBottom: 2 }}>Live Queue</h2>
              <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>Leads awaiting round-robin assignment</p>
            </div>
            {lateLeads.length > 0 && (
              <span className="b24-badge b24-badge-warning">{lateLeads.length} waiting</span>
            )}
          </div>
          <table className="b24-table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Arrived</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--b24-text-muted)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <svg className="b24-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="var(--b24-primary)" strokeWidth="3" strokeOpacity="0.2" />
                        <path fill="var(--b24-primary)" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Loading queue…
                    </div>
                  </td>
                </tr>
              ) : lateLeads.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      icon={<svg width="20" height="20" fill="none" stroke="var(--b24-green)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                      title="Queue is clear"
                      sub="All leads have been processed."
                    />
                  </td>
                </tr>
              ) : lateLeads.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600, color: 'var(--b24-primary)' }}>#{lead.lead_id}</td>
                  <td style={{ color: 'var(--b24-text-muted)' }}>{new Date(lead.created_at).toLocaleString()}</td>
                  <td><span className="b24-badge b24-badge-warning">Waiting</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => forceAssign(lead.lead_id)}
                      disabled={assigning === lead.lead_id}
                      className="b24-btn b24-btn-primary"
                      style={{ height: 28, fontSize: 12, padding: '0 12px' }}
                    >
                      {assigning === lead.lead_id ? 'Assigning…' : 'Force Assign'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Assignments — second table like HomeSales.vue */}
        <div className="b24-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--b24-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--b24-text)', marginBottom: 2 }}>Recent Assignments</h2>
              <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>Last 10 round-robin lead assignments</p>
            </div>
          </div>
          <table className="b24-table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Agent</th>
                <th>Team</th>
                <th>Assigned At</th>
                <th style={{ textAlign: 'center' }}>WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--b24-text-muted)' }}>Loading…</td></tr>
              ) : recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<svg width="20" height="20" fill="none" stroke="var(--b24-text-muted)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                      title="No assignments yet"
                      sub="Assignment history will appear here."
                    />
                  </td>
                </tr>
              ) : recentLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 600, color: 'var(--b24-primary)' }}>#{log.lead_id}</td>
                  <td style={{ fontWeight: 500 }}>{log.agent_name}</td>
                  <td style={{ color: 'var(--b24-text-muted)' }}>{log.team}</td>
                  <td style={{ color: 'var(--b24-text-muted)' }}>{new Date(log.assigned_at).toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}>
                    {log.wa_notified
                      ? <span className="b24-badge b24-badge-success">Sent</span>
                      : <span style={{ color: 'var(--b24-text-light)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default DashboardHome;
