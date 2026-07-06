import React, { useState, useEffect } from 'react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

/* ── Stat card — exact HomeStats.vue tinted-alt card ── */
const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  iconColor: string;
  iconBg: string;
  icon: React.ReactNode;
  badge?: { text: string; type: 'success' | 'alert' | 'warning' | 'neutral' };
}> = ({ label, value, iconColor, iconBg, icon, badge }) => (
  <div className="b24-card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      {/* Icon in rounded-full circle */}
      <div className="b24-stat-icon" style={{ background: iconBg, boxShadow: `inset 0 0 0 1px ${iconColor}33` }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      {badge && <span className={`b24-badge b24-badge-${badge.type}`}>{badge.text}</span>}
    </div>
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--b24-text-muted)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--b24-text)', lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  </div>
);

const Spinner = () => (
  <svg className="b24-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="var(--b24-primary)" strokeWidth="3" strokeOpacity="0.2" />
    <path fill="var(--b24-primary)" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const EmptyRow: React.FC<{ cols: number; msg: string; sub?: string }> = ({ cols, msg, sub }) => (
  <tr>
    <td colSpan={cols} style={{ padding: '44px 20px', textAlign: 'center' }}>
      <p style={{ fontWeight: 600, color: 'var(--b24-text-muted)', marginBottom: sub ? 4 : 0 }}>{msg}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--b24-text-faint)' }}>{sub}</p>}
    </td>
  </tr>
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
      const base = API();
      const [a, b, c] = await Promise.all([
        fetch(`${base}/api/workflow/late-leads`),
        fetch(`${base}/api/workflow/assigned-today`),
        fetch(`${base}/api/workflow/assignment-log?limit=10`),
      ]);
      if (a.ok) setLateLeads(await a.json());
      if (b.ok) setAssignedToday(await b.json());
      if (c.ok) setRecentLogs(await c.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const forceAssign = async (leadId: string) => {
    setAssigning(leadId);
    try {
      const base = API();
      await fetch(`${base}/api/workflow/assign-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          team: 'Sales Executives',
          access_token: localStorage.getItem('bitrix_access_token'),
          domain: localStorage.getItem('bitrix_domain'),
        }),
      });
      await fetchData();
    } catch (e) { console.error(e); }
    finally { setAssigning(null); }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--b24-bg)' }}>

      {/* Navbar — matches B24DashboardNavbar */}
      <div className="b24-navbar">
        <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--b24-text)' }}>Home</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={fetchData} disabled={loading} className="b24-btn b24-btn-secondary" style={{ gap: 6 }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" className={loading ? 'b24-spin' : ''}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reload
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Stats — B24PageGrid lg:grid-cols-4 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatCard
            label="Pending in Queue"
            value={loading ? '—' : lateLeads.length}
            iconColor="#e09800"
            iconBg="rgba(224,152,0,0.12)"
            icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            badge={lateLeads.length > 0 ? { text: 'Needs action', type: 'warning' } : undefined}
          />
          <StatCard
            label="Assigned Today"
            value={loading ? '—' : assignedToday}
            iconColor="var(--b24-primary)"
            iconBg="var(--b24-primary-dim)"
            icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            badge={{ text: 'Today', type: 'neutral' }}
          />
          <StatCard
            label="Distribution"
            value="Active"
            iconColor="var(--b24-green)"
            iconBg="var(--b24-green-dim)"
            icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            badge={{ text: 'Running', type: 'success' }}
          />
          <StatCard
            label="Recent Assignments"
            value={loading ? '—' : recentLogs.length}
            iconColor="var(--b24-text-muted)"
            iconBg="rgba(130,139,149,0.1)"
            icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            badge={{ text: 'Last 10', type: 'neutral' }}
          />
        </div>

        {/* Live Queue table */}
        <div className="b24-card">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--b24-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--b24-text)', marginBottom: 2 }}>Live Queue</p>
              <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>Leads awaiting round-robin assignment</p>
            </div>
            {lateLeads.length > 0 && <span className="b24-badge b24-badge-warning">{lateLeads.length} waiting</span>}
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
                <tr><td colSpan={4} style={{ padding: '36px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--b24-text-muted)', fontSize: 13 }}>
                    <Spinner /> Loading queue…
                  </div>
                </td></tr>
              ) : lateLeads.length === 0 ? (
                <EmptyRow cols={4} msg="Queue is clear" sub="All leads have been processed." />
              ) : lateLeads.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600, color: 'var(--b24-primary)', fontFamily: 'monospace' }}>#{lead.lead_id}</td>
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

        {/* Recent Assignments table */}
        <div className="b24-card">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--b24-divider)' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--b24-text)', marginBottom: 2 }}>Recent Assignments</p>
            <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>Last 10 round-robin lead assignments</p>
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
                <tr><td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--b24-text-muted)' }}>Loading…</td></tr>
              ) : recentLogs.length === 0 ? (
                <EmptyRow cols={5} msg="No assignments yet" sub="History will appear here." />
              ) : recentLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontWeight: 600, color: 'var(--b24-primary)', fontFamily: 'monospace' }}>#{log.lead_id}</td>
                  <td style={{ fontWeight: 500 }}>{log.agent_name}</td>
                  <td style={{ color: 'var(--b24-text-muted)' }}>{log.team}</td>
                  <td style={{ color: 'var(--b24-text-muted)' }}>{new Date(log.assigned_at).toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}>
                    {log.wa_notified
                      ? <span className="b24-badge b24-badge-success">Sent</span>
                      : <span style={{ color: 'var(--b24-text-faint)' }}>—</span>}
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
