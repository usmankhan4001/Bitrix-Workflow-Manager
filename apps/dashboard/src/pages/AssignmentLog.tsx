import React, { useState, useEffect, useMemo } from 'react';
import { getStoredAuth } from '../lib/bx24';

const API = () => import.meta.env.VITE_API_URL ?? '';

interface LogEntry {
  id: string;
  lead_id: string;
  agent_id: string;
  agent_name: string;
  team: string;
  assigned_at: string;
  wa_notified: boolean;
}

const LIMIT_OPTIONS = [50, 100, 250, 500];

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

const leadUrl = (leadId: string) => {
  const { domain } = getStoredAuth();
  return domain ? `https://${domain}/crm/lead/details/${leadId}/` : null;
};

const AssignmentLog: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);
  const [filterTeam, setFilterTeam] = useState('All');
  const [search, setSearch] = useState('');

  const fetchLog = async () => {
    setLoading(true);
    try {
      const base = API();
      const [resLog, resTeams] = await Promise.all([
        fetch(`${base}/api/workflow/assignment-log?limit=${limit}`),
        fetch(`${base}/api/workflow/teams`),
      ]);
      if (resLog.ok) setEntries(await resLog.json());
      if (resTeams.ok) {
        const t = await resTeams.json();
        if (t && t.length > 0) setTeams(t);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const allTeams = useMemo(() => {
    const fromEntries = Array.from(new Set(entries.map(e => e.team)));
    return ['All', ...Array.from(new Set([...teams, ...fromEntries]))];
  }, [teams, entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(e =>
      (filterTeam === 'All' || e.team === filterTeam) &&
      (!q || e.lead_id.toLowerCase().includes(q) || e.agent_name.toLowerCase().includes(q))
    );
  }, [entries, filterTeam, search]);

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <div className="b24-navbar">
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b24-text)' }}>Assignment Log</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="b24-badge b24-badge-neutral">{filtered.length} of {entries.length}</span>
          <select className="b24-select" style={{ height: 30, fontSize: 12 }} value={limit} onChange={e => setLimit(Number(e.target.value))}>
            {LIMIT_OPTIONS.map(n => <option key={n} value={n}>Last {n}</option>)}
          </select>
          <button onClick={fetchLog} disabled={loading} className="b24-btn b24-btn-secondary" style={{ gap: 6 }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" className={loading ? 'b24-spin' : ''}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '8px 20px', background: 'var(--b24-card)', borderBottom: '1px solid var(--b24-divider)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {allTeams.map(t => (
            <button key={t} onClick={() => setFilterTeam(t)}
              className={`b24-btn ${filterTeam === t ? 'b24-btn-primary' : 'b24-btn-ghost'}`}
              style={{ height: 26, fontSize: 11, padding: '0 10px' }}>
              {t}
            </button>
          ))}
        </div>
        <input
          className="b24-input"
          style={{ maxWidth: 240, marginLeft: 'auto' }}
          placeholder="Search lead ID or agent…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div className="b24-card">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1.4fr 0.9fr 1.3fr 0.9fr',
            padding: '10px 16px', borderBottom: '1px solid var(--b24-divider)',
          }}>
            {['Lead', 'Agent', 'Team', 'Assigned At', 'WhatsApp'].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--b24-text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg className="b24-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--b24-primary)" strokeWidth="3" strokeOpacity="0.2" />
                <path fill="var(--b24-primary)" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading log…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: 'var(--b24-text-muted)', fontWeight: 600, margin: 0 }}>No assignments found</p>
              <p style={{ color: 'var(--b24-text-faint)', fontSize: 12, marginTop: 4, margin: 0 }}>
                {search || filterTeam !== 'All' ? 'Try clearing the filters.' : 'Assignments will show up here once leads start routing.'}
              </p>
            </div>
          ) : (
            filtered.map(entry => {
              const url = leadUrl(entry.lead_id);
              return (
                <div key={entry.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1.4fr 0.9fr 1.3fr 0.9fr',
                  padding: '10px 16px', borderBottom: '1px solid var(--b24-divider)',
                  alignItems: 'center', fontSize: 13,
                }}>
                  <span>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--b24-primary)', textDecoration: 'none', fontWeight: 600 }}>
                        #{entry.lead_id}
                      </a>
                    ) : (
                      <span style={{ fontWeight: 600, color: 'var(--b24-text)' }}>#{entry.lead_id}</span>
                    )}
                  </span>
                  <span style={{ color: 'var(--b24-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.agent_name}</span>
                  <span><span className="b24-badge b24-badge-primary" style={{ fontSize: 10 }}>{entry.team}</span></span>
                  <span style={{ color: 'var(--b24-text-muted)', fontSize: 12 }}>{formatDate(entry.assigned_at)}</span>
                  <span>
                    <span className={`b24-badge ${entry.wa_notified ? 'b24-badge-success' : 'b24-badge-neutral'}`} style={{ fontSize: 10 }}>
                      {entry.wa_notified ? 'Sent' : '—'}
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentLog;
