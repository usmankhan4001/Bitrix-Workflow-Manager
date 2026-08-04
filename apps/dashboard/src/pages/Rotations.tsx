import React, { useState, useEffect, useMemo } from 'react';
import { getStoredAuth } from '../lib/bx24';
import { apiFetch } from '../lib/api';

interface RotationEntry {
  id: string;
  lead_id: string;
  team: string;
  current_agent_id: string;
  current_agent_name: string;
  assigned_at: string;
  tried_agent_ids: string;
  lap_number: number;
  status: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

const leadUrl = (leadId: string) => {
  const { domain } = getStoredAuth();
  return domain ? `https://${domain}/crm/lead/details/${leadId}/` : null;
};

const elapsedLabel = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
};

const parseIds = (json: string): string[] => { try { return JSON.parse(json); } catch { return []; } };

const Rotations: React.FC = () => {
  const [entries, setEntries] = useState<RotationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  const fetchRotations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/workflow/rotations');
      if (res.ok) setEntries(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRotations();
    const poll = setInterval(fetchRotations, 30000);
    const clock = setInterval(() => setTick(t => t + 1), 30000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, []);

  const rows = useMemo(() => entries, [entries]);

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="b24-navbar">
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b24-text)' }}>Live SLA Rotations</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="b24-badge b24-badge-neutral">{rows.length} in progress</span>
          <button onClick={fetchRotations} disabled={loading} className="b24-btn b24-btn-secondary" style={{ gap: 6 }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" className={loading ? 'b24-spin' : ''}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div style={{
        padding: '10px 20px', background: 'var(--b24-primary-dim)', borderBottom: '1px solid var(--b24-primary-ring)',
        fontSize: 12, color: 'var(--b24-text-muted)',
      }}>
        Replaces the old task-based tracking: each lead here is still in the "New Lead" stage and holding its SLA clock against whoever's shown.
        A lead moving out of "New Lead" or timing out clears/rotates automatically — nothing to close manually.
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div className="b24-card">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1.3fr 0.8fr 0.8fr 1.1fr 0.9fr',
            padding: '10px 16px', borderBottom: '1px solid var(--b24-divider)',
          }}>
            {['Lead', 'Holding It', 'Team', 'Lap', 'Assigned', 'Tried So Far'].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--b24-text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg className="b24-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--b24-primary)" strokeWidth="3" strokeOpacity="0.2" />
                <path fill="var(--b24-primary)" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: 'var(--b24-text-muted)', fontWeight: 600, margin: 0 }}>No leads currently in rotation</p>
              <p style={{ color: 'var(--b24-text-faint)', fontSize: 12, marginTop: 4, margin: 0 }}>
                Leads show up here the moment they're assigned, and drop off once worked or escalated.
              </p>
            </div>
          ) : (
            rows.map(entry => {
              const url = leadUrl(entry.lead_id);
              const triedCount = parseIds(entry.tried_agent_ids).length;
              return (
                <div key={entry.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1.3fr 0.8fr 0.8fr 1.1fr 0.9fr',
                  padding: '10px 16px', borderBottom: '1px solid var(--b24-divider)',
                  alignItems: 'center', fontSize: 13,
                }}>
                  <span>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--b24-primary)', textDecoration: 'none', fontWeight: 600 }}>
                        #{entry.lead_id}
                      </a>
                    ) : <span style={{ fontWeight: 600 }}>#{entry.lead_id}</span>}
                  </span>
                  <span style={{ color: 'var(--b24-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.current_agent_name}
                    {entry.status === 'escalated' && <span className="b24-badge b24-badge-danger" style={{ fontSize: 9, marginLeft: 6 }}>Escalated · no timer</span>}
                  </span>
                  <span><span className="b24-badge b24-badge-primary" style={{ fontSize: 10 }}>{entry.team}</span></span>
                  <span style={{ color: 'var(--b24-text-muted)', fontSize: 12 }}>{entry.status === 'escalated' ? '—' : `${entry.lap_number}`}</span>
                  <span style={{ color: 'var(--b24-text-muted)', fontSize: 12 }}>
                    {formatDate(entry.assigned_at)}
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--b24-text-faint)' }}>{elapsedLabel(entry.assigned_at)}</span>
                  </span>
                  <span style={{ color: 'var(--b24-text-muted)', fontSize: 12 }}>{triedCount} agent{triedCount === 1 ? '' : 's'}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Rotations;
