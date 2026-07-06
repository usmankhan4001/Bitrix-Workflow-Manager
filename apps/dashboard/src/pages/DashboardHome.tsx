import React, { useState, useEffect } from 'react';

const API = () => import.meta.env.VITE_API_URL || '';

interface WorkflowStatus {
  engineEnabled: boolean;
  assignmentTeam: string;
  withinBusinessHours: boolean;
  lastAssigned: { id: string; name: string } | null;
  nextAgent: { id: string; name: string } | null;
  activeAgentCount: number;
  totalAgentCount: number;
  queueDepth: number;
  assignedToday: number;
  agentWorkload: { name: string; count: number }[];
  teams: string[];
  agents: { id: string; name: string; team: string; is_active: boolean }[];
}

const Spin = () => (
  <svg className="b24-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="var(--b24-primary)" strokeWidth="3" strokeOpacity="0.2" />
    <path fill="var(--b24-primary)" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

const DashboardHome: React.FC = () => {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [lateLeads, setLateLeads] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const base = API();
      const [resStatus, resLate, resLogs] = await Promise.all([
        fetch(`${base}/api/workflow/status`),
        fetch(`${base}/api/workflow/late-leads`),
        fetch(`${base}/api/workflow/assignment-log?limit=30`),
      ]);
      if (resStatus.ok) setStatus(await resStatus.json());
      if (resLate.ok) setLateLeads(await resLate.json());
      if (resLogs.ok) setRecentLogs(await resLogs.json());
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const forceAssign = async (leadId: string) => {
    if (!status) return;
    setAssigning(leadId);
    try {
      await fetch(`${API()}/api/workflow/assign-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, team: status.assignmentTeam, force: true }),
      });
      await fetchData();
    } catch (e) {
      console.error('Error assigning lead:', e);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <div className="b24-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b24-text)' }}>Lead Command Center</h1>
          {status && (
            <span
              className={`b24-badge b24-badge-${status.engineEnabled ? 'success' : 'danger'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '2px 8px' }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: status.engineEnabled ? 'var(--b24-green)' : 'var(--b24-danger)',
                }}
              />
              {status.engineEnabled ? 'Engine Active' : 'Engine Paused'}
            </span>
          )}
        </div>
        <button onClick={fetchData} disabled={loading} className="b24-btn b24-btn-secondary" style={{ gap: 6 }}>
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            className={loading ? 'b24-spin' : ''}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh Status
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Status Bar (Section A) */}
          {status && (
            <div
              className="b24-card"
              style={{
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                background: 'var(--b24-btn-sec-bg)',
                border: '1px solid var(--b24-divider)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--b24-text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Workflow Engine</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: status.engineEnabled ? 'var(--b24-green)' : 'var(--b24-danger)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {status.engineEnabled ? '● Running' : '● Paused'}
                  </span>
                </div>
                <div style={{ width: 1, height: 24, background: 'var(--b24-divider)' }} />
                <div>
                  <span style={{ fontSize: 11, color: 'var(--b24-text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Target Team</span>
                  <span className="b24-badge b24-badge-primary" style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                    {status.assignmentTeam}
                  </span>
                </div>
                <div style={{ width: 1, height: 24, background: 'var(--b24-divider)' }} />
                <div>
                  <span style={{ fontSize: 11, color: 'var(--b24-text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Business Hours</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: status.withinBusinessHours ? 'var(--b24-green)' : 'var(--b24-orange)' }}>
                    {status.withinBusinessHours ? 'Open (Assigning Live)' : 'Closed (Queuing Leads)'}
                  </span>
                </div>
                <div style={{ width: 1, height: 24, background: 'var(--b24-divider)' }} />
                <div>
                  <span style={{ fontSize: 11, color: 'var(--b24-text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Active Rotation Pool</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--b24-text)' }}>
                    {status.activeAgentCount} of {status.totalAgentCount} active B2C employees
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Who's Next (Section B) */}
          {status && (
            <div
              className="b24-card"
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, var(--b24-card) 0%, var(--b24-primary-dim) 100%)',
                border: '1px solid var(--b24-primary-dim)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--b24-primary)', margin: 0 }}>
                Round-Robin Rotation Sequence
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', margin: '8px 0' }}>
                {status.lastAssigned ? (
                  <div style={{ background: 'var(--b24-card)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--b24-divider)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: 11, color: 'var(--b24-text-muted)', display: 'block' }}>Last Assigned Lead</span>
                    <span style={{ fontWeight: 700, color: 'var(--b24-text)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                      ✓ {status.lastAssigned.name}
                    </span>
                  </div>
                ) : (
                  <div style={{ background: 'var(--b24-card)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--b24-divider)', color: 'var(--b24-text-muted)', fontSize: 13 }}>
                    No leads assigned yet
                  </div>
                )}

                <div style={{ color: 'var(--b24-primary)', fontSize: 24, fontWeight: 300 }}>➔</div>

                {status.nextAgent ? (
                  <div style={{ background: 'var(--b24-card)', padding: '10px 16px', borderRadius: 8, border: '2px solid var(--b24-primary)', boxShadow: '0 4px 12px rgba(var(--b24-primary-rgb), 0.1)' }}>
                    <span style={{ fontSize: 11, color: 'var(--b24-primary)', fontWeight: 600, display: 'block' }}>NEXT UP FOR LEAD</span>
                    <span style={{ fontWeight: 800, color: 'var(--b24-text)', fontSize: 15 }}>
                      👤 {status.nextAgent.name}
                    </span>
                  </div>
                ) : (
                  <div style={{ background: 'var(--b24-card)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--b24-danger)', color: 'var(--b24-danger)', fontSize: 13 }}>
                    ⚠️ No active agents eligible for assignment!
                  </div>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--b24-text-muted)', margin: 0 }}>
                Leads are assigned dynamically, one-by-one, in alphabetical/sort order to active B2C employees.
              </p>
            </div>
          )}

          {/* Stats Row (Section C) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="b24-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--b24-text-muted)' }}>Leads Waiting in Queue</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: lateLeads.length > 0 ? 'var(--b24-orange)' : 'var(--b24-text)' }}>
                {loading ? '—' : lateLeads.length}
              </span>
              <span className={`b24-badge b24-badge-${lateLeads.length > 0 ? 'warning' : 'success'}`} style={{ alignSelf: 'flex-start', fontSize: 10 }}>
                {lateLeads.length > 0 ? 'Immediate action required' : 'Queue is clear'}
              </span>
            </div>

            <div className="b24-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--b24-text-muted)' }}>Assigned Today</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--b24-text)' }}>
                {status ? status.assignedToday : '—'}
              </span>
              <span className="b24-badge b24-badge-neutral" style={{ alignSelf: 'flex-start', fontSize: 10 }}>
                Reset at midnight
              </span>
            </div>

            <div className="b24-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--b24-text-muted)' }}>Active People</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--b24-text)' }}>
                {status ? `${status.activeAgentCount} / ${status.totalAgentCount}` : '—'}
              </span>
              <span className="b24-badge b24-badge-success" style={{ alignSelf: 'flex-start', fontSize: 10 }}>
                In active rotation
              </span>
            </div>

            <div className="b24-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--b24-text-muted)' }}>Operating Hours</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: status?.withinBusinessHours ? 'var(--b24-green)' : 'var(--b24-orange)' }}>
                {status ? (status.withinBusinessHours ? 'Open' : 'Closed') : '—'}
              </span>
              <span className={`b24-badge b24-badge-${status?.withinBusinessHours ? 'success' : 'warning'}`} style={{ alignSelf: 'flex-start', fontSize: 10 }}>
                {status?.withinBusinessHours ? 'Live distribution' : 'Queuing mode'}
              </span>
            </div>
          </div>

          {/* Two-Column Row (Section D) */}
          <div className="b24-two-col" style={{ padding: 0, gap: 16 }}>
            {/* LEFT: Leads Waiting */}
            <div className="b24-card" style={{ minWidth: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b24-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: 13, color: 'var(--b24-text)', margin: 0 }}>Leads Waiting</h2>
                  <p style={{ fontSize: 11, color: 'var(--b24-text-muted)', margin: '2px 0 0 0' }}>Leads queued because of SLA overdue status or off-hours</p>
                </div>
                {lateLeads.length > 0 && <span className="b24-badge b24-badge-warning">{lateLeads.length} waiting</span>}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="b24-table">
                  <thead>
                    <tr>
                      <th>Lead ID</th>
                      <th>Arrived</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '32px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--b24-text-muted)', fontSize: 13 }}>
                            <Spin /> Loading queue…
                          </div>
                        </td>
                      </tr>
                    ) : lateLeads.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '32px', textAlign: 'center' }}>
                          <p style={{ fontWeight: 600, color: 'var(--b24-text-muted)', margin: 0 }}>Queue is clear ✓</p>
                          <p style={{ fontSize: 11, color: 'var(--b24-text-faint)', marginTop: 4, margin: 0 }}>All leads are assigned.</p>
                        </td>
                      </tr>
                    ) : (
                      lateLeads.map((lead) => (
                        <tr key={lead.id}>
                          <td style={{ fontWeight: 600, color: 'var(--b24-primary)', fontFamily: 'monospace', fontSize: 12 }}>
                            #{lead.lead_id}
                          </td>
                          <td style={{ color: 'var(--b24-text-muted)', fontSize: 12 }}>
                            {new Date(lead.created_at).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => forceAssign(lead.lead_id)}
                              disabled={assigning === lead.lead_id}
                              className="b24-btn b24-btn-primary"
                              style={{ height: 26, fontSize: 11, padding: '0 10px' }}
                            >
                              {assigning === lead.lead_id ? 'Assigning…' : 'Assign Now'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: Today's Workload */}
            <div className="b24-card" style={{ minWidth: 0 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b24-divider)' }}>
                <h2 style={{ fontWeight: 700, fontSize: 13, color: 'var(--b24-text)', margin: 0 }}>Today's Workload</h2>
                <p style={{ fontSize: 11, color: 'var(--b24-text-muted)', margin: '2px 0 0 0' }}>Number of leads assigned to each active person today</p>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {status?.agentWorkload && status.agentWorkload.length > 0 ? (
                  status.agentWorkload.map((workload, idx) => {
                    const maxCount = Math.max(...status.agentWorkload.map((w) => w.count), 1);
                    const percentage = (workload.count / maxCount) * 100;
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: 'var(--b24-text)' }}>{workload.name}</span>
                          <span style={{ fontWeight: 700, color: 'var(--b24-primary)' }}>{workload.count} leads</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(0,0,0,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${percentage}%`,
                              background: 'var(--b24-primary)',
                              borderRadius: 3,
                              transition: 'width 0.5s ease-out',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--b24-text-muted)', fontSize: 12 }}>
                    No assignments yet today.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity (Section E) */}
          <div className="b24-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--b24-divider)' }}>
              <h2 style={{ fontWeight: 700, fontSize: 13, color: 'var(--b24-text)', margin: 0 }}>Recent Lead Activity</h2>
              <p style={{ fontSize: 11, color: 'var(--b24-text-muted)', margin: '2px 0 0 0' }}>The history of recent round-robin assignments (Last 30)</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="b24-table">
                <thead>
                  <tr>
                    <th>Lead ID</th>
                    <th>Lead Name</th>
                    <th>Source</th>
                    <th>Assigned To</th>
                    <th>Team</th>
                    <th>Assigned At</th>
                    <th style={{ textAlign: 'center' }}>WhatsApp Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--b24-text-muted)' }}>
                        Loading activity logs…
                      </td>
                    </tr>
                  ) : recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center' }}>
                        <p style={{ fontWeight: 600, color: 'var(--b24-text-muted)', margin: 0 }}>No recent assignments</p>
                        <p style={{ fontSize: 11, color: 'var(--b24-text-faint)', marginTop: 4, margin: 0 }}>
                          Logs will appear here once assignments occur.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 600, color: 'var(--b24-primary)', fontFamily: 'monospace', fontSize: 11 }}>
                          #{log.lead_id}
                        </td>
                        <td style={{ fontWeight: 500, fontSize: 12, color: 'var(--b24-text)' }}>
                          {log.lead_name || `Lead #${log.lead_id}`}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>
                          {log.lead_source || 'CRM'}
                        </td>
                        <td style={{ fontWeight: 600, fontSize: 12 }}>
                          👤 {log.agent_name}
                        </td>
                        <td style={{ fontSize: 11 }}>
                          <span className="b24-badge b24-badge-neutral">{log.team}</span>
                        </td>
                        <td style={{ color: 'var(--b24-text-muted)', fontSize: 11 }}>
                          {new Date(log.assigned_at).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {log.wa_notified ? (
                            <span className="b24-badge b24-badge-success" style={{ fontSize: 10, padding: '2px 6px' }}>
                              ✓ Sent
                            </span>
                          ) : (
                            <span style={{ color: 'var(--b24-text-faint)', fontSize: 11 }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
