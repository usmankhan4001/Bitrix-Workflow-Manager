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

const DashboardHome: React.FC = () => {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const base = API();
      const resStatus = await fetch(`${base}/api/workflow/status`);
      if (resStatus.ok) setStatus(await resStatus.json());
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          {/* Status Bar */}
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

          {/* Who's Next */}
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
                    <span style={{ fontSize: 11, color: 'var(--b24-text-muted)', display: 'block' }}>Last Assigned Agent</span>
                    <span style={{ fontWeight: 700, color: 'var(--b24-text)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                      ✓ {status.lastAssigned.name}
                    </span>
                  </div>
                ) : (
                  <div style={{ background: 'var(--b24-card)', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--b24-divider)', color: 'var(--b24-text-muted)', fontSize: 13 }}>
                    No assignments recorded yet
                  </div>
                )}

                <div style={{ color: 'var(--b24-primary)', fontSize: 24, fontWeight: 300 }}>➔</div>

                {status.nextAgent ? (
                  <div style={{ background: 'var(--b24-card)', padding: '10px 16px', borderRadius: 8, border: '2px solid var(--b24-primary)', boxShadow: '0 4px 12px rgba(var(--b24-primary-rgb), 0.1)' }}>
                    <span style={{ fontSize: 11, color: 'var(--b24-primary)', fontWeight: 600, display: 'block' }}>NEXT UP IN ROTATION</span>
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
                Incoming leads are assigned automatically in alphabetical/sort order to active B2C employees.
              </p>
            </div>
          )}

          {/* Stats Row */}
          {status && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div className="b24-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--b24-text-muted)' }}>Leads in Queue</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: status.queueDepth > 0 ? 'var(--b24-orange)' : 'var(--b24-text)' }}>
                  {loading ? '—' : status.queueDepth}
                </span>
                <span className={`b24-badge b24-badge-${status.queueDepth > 0 ? 'warning' : 'success'}`} style={{ alignSelf: 'flex-start', fontSize: 10 }}>
                  {status.queueDepth > 0 ? 'Held for business hours' : 'Queue is clear'}
                </span>
              </div>

              <div className="b24-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--b24-text-muted)' }}>Assigned Today</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--b24-text)' }}>
                  {status ? status.assignedToday : '—'}
                </span>
                <span className="b24-badge b24-badge-neutral" style={{ alignSelf: 'flex-start', fontSize: 10 }}>
                  Resets daily at midnight
                </span>
              </div>

              <div className="b24-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--b24-text-muted)' }}>Rotation Pool Size</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--b24-text)' }}>
                  {status ? `${status.activeAgentCount} / ${status.totalAgentCount}` : '—'}
                </span>
                <span className="b24-badge b24-badge-success" style={{ alignSelf: 'flex-start', fontSize: 10 }}>
                  Active B2C members
                </span>
              </div>

              <div className="b24-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--b24-text-muted)' }}>Operating Hours</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: status.withinBusinessHours ? 'var(--b24-green)' : 'var(--b24-orange)' }}>
                  {status.withinBusinessHours ? 'Open' : 'Closed'}
                </span>
                <span className={`b24-badge b24-badge-${status.withinBusinessHours ? 'success' : 'warning'}`} style={{ alignSelf: 'flex-start', fontSize: 10 }}>
                  {status.withinBusinessHours ? 'Live distribution' : 'Queuing mode'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
