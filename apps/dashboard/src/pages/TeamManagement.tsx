import React, { useState, useEffect, useMemo } from 'react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Agent { id: string; bitrix_user_id: string; name: string; team: string; whatsapp_phone?: string; is_active: boolean; }
interface BitrixUser { id: string; name: string; email: string; department_id: string | null; department_name: string; phone: string; avatar: string | null; active: boolean; }

const TEAMS = ['Sales Executives', 'Telly Sales'];

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--b24-text-muted)', marginBottom: 5 }}>
    {children}
  </label>
);

const TeamManagement: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [bitrixUsers, setBitrixUsers] = useState<BitrixUser[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ bitrix_user_id: '', name: '', team: TEAMS[0], whatsapp_phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [filterTeam, setFilterTeam] = useState('All');
  const [searchDept, setSearchDept] = useState('');

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try { const r = await fetch(`${API()}/api/workflow/agents`); if (r.ok) setAgents(await r.json()); }
    catch (e) { console.error(e); } finally { setLoadingAgents(false); }
  };
  const fetchBitrixUsers = async () => {
    setLoadingUsers(true);
    try { const r = await fetch(`${API()}/api/bitrix/webhook-users`); if (r.ok) { const d = await r.json(); setBitrixUsers(d.users || []); } }
    catch (e) { console.error(e); } finally { setLoadingUsers(false); }
  };
  useEffect(() => { fetchAgents(); fetchBitrixUsers(); }, []);

  const usersByDept = useMemo(() => {
    const g: Record<string, BitrixUser[]> = {};
    for (const u of bitrixUsers) {
      if (!u.active) continue;
      const d = u.department_name || 'No Department';
      if (!g[d]) g[d] = [];
      g[d].push(u);
    }
    return g;
  }, [bitrixUsers]);

  const filteredDepts = useMemo(() => {
    if (!searchDept) return usersByDept;
    const q = searchDept.toLowerCase();
    const f: Record<string, BitrixUser[]> = {};
    for (const [d, us] of Object.entries(usersByDept)) {
      const m = us.filter(u => u.name.toLowerCase().includes(q) || d.toLowerCase().includes(q));
      if (m.length) f[d] = m;
    }
    return f;
  }, [usersByDept, searchDept]);

  const selectUser = (id: string) => {
    const u = bitrixUsers.find(u => u.id === id);
    if (u) setForm(f => ({ ...f, bitrix_user_id: u.id, name: u.name, whatsapp_phone: u.phone || f.whatsapp_phone }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bitrix_user_id || !form.name) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await fetch(`${API()}/api/workflow/agents/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, team: form.team, whatsapp_phone: form.whatsapp_phone }) });
        setEditingId(null);
      } else {
        await fetch(`${API()}/api/workflow/agents`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      setForm({ bitrix_user_id: '', name: '', team: TEAMS[0], whatsapp_phone: '' });
      await fetchAgents();
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const toggleActive = async (id: string, cur: boolean) => {
    await fetch(`${API()}/api/workflow/agents/${id}/active`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !cur }) });
    fetchAgents();
  };
  const deleteAgent = async (id: string) => {
    if (!confirm('Remove this agent from the rotation?')) return;
    await fetch(`${API()}/api/workflow/agents/${id}`, { method: 'DELETE' });
    fetchAgents();
  };

  const filtered = filterTeam === 'All' ? agents : agents.filter(a => a.team === filterTeam);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--b24-bg)' }}>
      <div className="b24-navbar">
        <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--b24-text)' }}>Team</h1>
        <span style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>{agents.length} agents</span>
      </div>

      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16, alignItems: 'start' }}>

        {/* Roster */}
        <div>
          <div className="b24-section-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--b24-text)', marginBottom: 2 }}>Active Roster</p>
              <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>Agents in the round-robin rotation</p>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {['All', ...TEAMS].map(t => (
                <button key={t} onClick={() => setFilterTeam(t)}
                  className={`b24-btn ${filterTeam === t ? 'b24-btn-primary' : 'b24-btn-ghost'}`}
                  style={{ height: 26, fontSize: 11, padding: '0 10px' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="b24-section-body">
            <table className="b24-table">
              <thead><tr>
                <th>Agent</th><th>Bitrix ID</th><th>Team</th><th>WhatsApp</th><th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr></thead>
              <tbody>
                {loadingAgents ? (
                  <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--b24-text-muted)' }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--b24-text-muted)' }}>No agents yet.</p>
                    <p style={{ fontSize: 12, color: 'var(--b24-text-faint)', marginTop: 4 }}>Add agents using the form →</p>
                  </td></tr>
                ) : filtered.map(agent => (
                  <tr key={agent.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--b24-primary-dim)', color: 'var(--b24-primary)', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{agent.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--b24-primary)', fontFamily: 'monospace', fontSize: 12 }}>#{agent.bitrix_user_id}</td>
                    <td style={{ color: 'var(--b24-text-muted)' }}>{agent.team}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--b24-text-muted)' }}>
                      {agent.whatsapp_phone || <span style={{ color: 'var(--b24-text-faint)', fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td>
                      <button onClick={() => toggleActive(agent.id, agent.is_active)}
                        className={`b24-badge b24-badge-${agent.is_active ? 'success' : 'alert'}`}
                        style={{ cursor: 'pointer', border: 'none' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: agent.is_active ? 'var(--b24-green)' : 'var(--b24-red)', display: 'inline-block' }} />
                        {agent.is_active ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button onClick={() => { setEditingId(agent.id); setForm({ bitrix_user_id: agent.bitrix_user_id, name: agent.name, team: agent.team, whatsapp_phone: agent.whatsapp_phone || '' }); }}
                          style={{ fontSize: 12, color: 'var(--b24-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Edit</button>
                        <span style={{ color: 'var(--b24-divider)' }}>|</span>
                        <button onClick={() => deleteAgent(agent.id)}
                          style={{ fontSize: 12, color: 'var(--b24-red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add / Edit form */}
        <div>
          <div className="b24-section-top">
            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--b24-text)', marginBottom: 2 }}>{editingId ? 'Edit Agent' : 'Add Agent'}</p>
            <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>{editingId ? 'Update details' : 'Register a Bitrix24 user'}</p>
          </div>
          <div className="b24-section-body" style={{ padding: '16px 18px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {!editingId && (
                <div>
                  <FieldLabel>Select from Bitrix24</FieldLabel>
                  {loadingUsers ? (
                    <div className="b24-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--b24-text-muted)' }}>Loading users…</div>
                  ) : bitrixUsers.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <input type="text" className="b24-input" placeholder="Bitrix User ID" value={form.bitrix_user_id} onChange={e => setForm(f => ({ ...f, bitrix_user_id: e.target.value }))} />
                      <p style={{ fontSize: 11, color: 'var(--b24-text-faint)' }}>Login via OAuth to load user picker.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <input type="text" className="b24-input" placeholder="Search name or dept…" value={searchDept} onChange={e => setSearchDept(e.target.value)} />
                      <select className="b24-select" value={form.bitrix_user_id} onChange={e => selectUser(e.target.value)}>
                        <option value="">— Choose a user —</option>
                        {Object.entries(filteredDepts).map(([dept, users]) => (
                          <optgroup key={dept} label={dept}>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email || `ID: ${u.id}`})</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div><FieldLabel>Agent Name</FieldLabel>
                <input type="text" required className="b24-input" placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div><FieldLabel>Rotation Team</FieldLabel>
                <select className="b24-select" value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))}>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>WhatsApp <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11, color: 'var(--b24-text-faint)' }}>(with country code)</span></FieldLabel>
                <input type="text" className="b24-input" style={{ fontFamily: 'monospace' }} placeholder="e.g. 923001234567" value={form.whatsapp_phone} onChange={e => setForm(f => ({ ...f, whatsapp_phone: e.target.value }))} />
                <p style={{ fontSize: 11, color: 'var(--b24-text-faint)', marginTop: 4 }}>No + sign. Used for WA alerts.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                <button type="submit" disabled={submitting} className="b24-btn b24-btn-primary" style={{ flex: 1 }}>
                  {submitting ? 'Saving…' : editingId ? 'Update Agent' : 'Add to Rotation'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setForm({ bitrix_user_id: '', name: '', team: TEAMS[0], whatsapp_phone: '' }); }} className="b24-btn b24-btn-secondary">Cancel</button>
                )}
              </div>
            </form>
            {bitrixUsers.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--b24-divider-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" fill="var(--b24-green)" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>{bitrixUsers.length} users loaded</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
