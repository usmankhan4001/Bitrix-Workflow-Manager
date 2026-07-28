import React, { useState, useEffect, useMemo } from 'react';
import { getStoredAuth } from '../lib/bx24';
import { apiFetch } from '../lib/api';

interface DuplicateEntry {
  id: string;
  lead_id: string;
  lead_name: string;
  team: string;
  matched_lead_ids: string;
  matched_fields: string;
  auto_merged?: boolean;
  detected_at: string;
  resolved: boolean;
  resolved_at: string | null;
}

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

const parseIds = (json: string): string[] => { try { return JSON.parse(json); } catch { return []; } };

const Duplicates: React.FC = () => {
  const [entries, setEntries] = useState<DuplicateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/workflow/duplicates?resolved=${showResolved}`);
      if (res.ok) setEntries(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResolved]);

  const dismiss = async (id: string) => {
    setResolving(id);
    try {
      await apiFetch(`/api/workflow/duplicates/${id}/resolve`, { method: 'PUT' });
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(null);
    }
  };

  const rows = useMemo(() => entries, [entries]);

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <div className="b24-navbar">
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b24-text)' }}>Duplicates</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="b24-badge b24-badge-neutral">{rows.length} {showResolved ? 'dismissed' : 'pending'}</span>
          <button
            onClick={() => setShowResolved(v => !v)}
            className={`b24-btn ${showResolved ? 'b24-btn-primary' : 'b24-btn-ghost'}`}
            style={{ height: 30, fontSize: 12, padding: '0 12px' }}
          >
            {showResolved ? 'Showing dismissed' : 'Show dismissed'}
          </button>
          <button onClick={fetchDuplicates} disabled={loading} className="b24-btn b24-btn-secondary" style={{ gap: 6 }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" className={loading ? 'b24-spin' : ''}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        padding: '10px 20px', background: 'var(--b24-primary-dim)', borderBottom: '1px solid var(--b24-primary-ring)',
        fontSize: 12, color: 'var(--b24-text-muted)',
      }}>
        Duplicate leads matching existing contacts (phone, email, or recent name submission) are <strong style={{ color: 'var(--b24-text)' }}>automatically merged into the primary lead</strong>, notified to the original agent, and marked as <strong style={{ color: 'var(--b24-text)' }}>JUNK</strong> in Bitrix24 to prevent CRM clutter.
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div className="b24-card">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1.3fr 0.8fr 1.6fr 1.2fr 0.8fr',
            padding: '10px 16px', borderBottom: '1px solid var(--b24-divider)',
          }}>
            {['Lead', 'Name', 'Team', 'Matched Against', 'Detected At', ''].map(h => (
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
              <p style={{ color: 'var(--b24-text-muted)', fontWeight: 600, margin: 0 }}>
                {showResolved ? 'Nothing dismissed yet' : 'No pending duplicates'}
              </p>
              <p style={{ color: 'var(--b24-text-faint)', fontSize: 12, marginTop: 4, margin: 0 }}>
                {showResolved ? '' : 'Flagged duplicates will show up here for review.'}
              </p>
            </div>
          ) : (
            rows.map(entry => {
              const url = leadUrl(entry.lead_id);
              const matchedIds = parseIds(entry.matched_lead_ids);
              const matchedFields = parseIds(entry.matched_fields);
              return (
                <div key={entry.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1.3fr 0.8fr 1.6fr 1.2fr 0.8fr',
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
                  <span style={{ color: 'var(--b24-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.lead_name}</span>
                  <span><span className="b24-badge b24-badge-primary" style={{ fontSize: 10 }}>{entry.team}</span></span>
                  <span style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>
                    {matchedIds.map((id, i) => {
                      const mUrl = leadUrl(id);
                      return (
                        <React.Fragment key={id}>
                          {i > 0 && ', '}
                          {mUrl ? <a href={mUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--b24-primary)' }}>#{id}</a> : `#${id}`}
                        </React.Fragment>
                      );
                    })}
                    {matchedFields.length > 0 && (
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--b24-text-faint)', marginTop: 2 }}>
                        via {matchedFields.join(', ')}
                      </span>
                    )}
                  </span>
                  <span style={{ color: 'var(--b24-text-muted)', fontSize: 12 }}>{formatDate(entry.detected_at)}</span>
                  <span>
                    {entry.auto_merged ? (
                      <span className="b24-badge b24-badge-success" style={{ fontSize: 10 }}>Auto-Merged</span>
                    ) : !entry.resolved ? (
                      <button
                        onClick={() => dismiss(entry.id)}
                        disabled={resolving === entry.id}
                        className="b24-btn b24-btn-secondary"
                        style={{ height: 26, fontSize: 11, padding: '0 10px' }}
                      >
                        {resolving === entry.id ? 'Dismissing…' : 'Dismiss'}
                      </button>
                    ) : (
                      <span className="b24-badge b24-badge-neutral" style={{ fontSize: 10 }}>Dismissed</span>
                    )}
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

export default Duplicates;
