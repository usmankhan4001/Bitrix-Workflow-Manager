import React, { useState, useEffect, useMemo } from 'react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Agent {
  id: string;
  bitrix_user_id: string;
  name: string;
  team: string;
  whatsapp_phone?: string;
  is_active: boolean;
}

interface BitrixUser {
  id: string;
  name: string;
  email: string;
  department_id: string | null;
  department_name: string;
  phone: string;
  avatar: string | null;
  active: boolean;
}

const TEAMS = ['Sales Executives', 'Telly Sales'];

const TeamManagement: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [bitrixUsers, setBitrixUsers] = useState<BitrixUser[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    bitrix_user_id: '',
    name: '',
    team: TEAMS[0],
    whatsapp_phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterTeam, setFilterTeam] = useState<string>('All');
  const [searchDept, setSearchDept] = useState('');


  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch(`${API()}/api/workflow/agents`);
      if (res.ok) setAgents(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingAgents(false); }
  };

  const fetchBitrixUsers = async () => {
    setLoadingUsers(true);
    try {
      // Uses the server-side webhook token — no OAuth required on the frontend
      const res = await fetch(`${API()}/api/bitrix/webhook-users`);
      if (res.ok) {
        const data = await res.json();
        setBitrixUsers(data.users || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingUsers(false); }
  };

  useEffect(() => {
    fetchAgents();
    fetchBitrixUsers();
  }, []);

  // Group users by department for the dropdown
  const usersByDept = useMemo(() => {
    const groups: Record<string, BitrixUser[]> = {};
    for (const u of bitrixUsers) {
      if (!u.active) continue;
      const dept = u.department_name || 'No Department';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(u);
    }
    return groups;
  }, [bitrixUsers]);

  const filteredDepts = useMemo(() => {
    if (!searchDept) return usersByDept;
    const q = searchDept.toLowerCase();
    const filtered: Record<string, BitrixUser[]> = {};
    for (const [dept, users] of Object.entries(usersByDept)) {
      const matchedUsers = users.filter(
        (u) => u.name.toLowerCase().includes(q) || dept.toLowerCase().includes(q),
      );
      if (matchedUsers.length > 0) filtered[dept] = matchedUsers;
    }
    return filtered;
  }, [usersByDept, searchDept]);

  const handleSelectBitrixUser = (userId: string) => {
    const user = bitrixUsers.find((u) => u.id === userId);
    if (user) {
      setForm((f) => ({ ...f, bitrix_user_id: user.id, name: user.name, whatsapp_phone: user.phone || f.whatsapp_phone }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bitrix_user_id || !form.name) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await fetch(`${API()}/api/workflow/agents/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, team: form.team, whatsapp_phone: form.whatsapp_phone }),
        });
        setEditingId(null);
      } else {
        await fetch(`${API()}/api/workflow/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setForm({ bitrix_user_id: '', name: '', team: TEAMS[0], whatsapp_phone: '' });
      await fetchAgents();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const startEdit = (agent: Agent) => {
    setEditingId(agent.id);
    setForm({ bitrix_user_id: agent.bitrix_user_id, name: agent.name, team: agent.team, whatsapp_phone: agent.whatsapp_phone || '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ bitrix_user_id: '', name: '', team: TEAMS[0], whatsapp_phone: '' });
  };

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`${API()}/api/workflow/agents/${id}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    fetchAgents();
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Remove this agent from the rotation?')) return;
    await fetch(`${API()}/api/workflow/agents/${id}`, { method: 'DELETE' });
    fetchAgents();
  };

  const filteredAgents = filterTeam === 'All' ? agents : agents.filter((a) => a.team === filterTeam);

  return (
    <div className="flex-1 overflow-auto bg-b24-bg">
      {/* Header */}
      <div className="page-header">
        <h1 className="text-xl font-semibold text-b24-text">Team Management</h1>
        <p className="text-b24-text-muted text-sm mt-0.5">Configure agents for the round-robin lead distribution.</p>
      </div>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Roster Table */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-b24-border flex items-center justify-between">
            <h2 className="font-semibold text-b24-text">
              Active Roster
              <span className="ml-2 text-xs font-normal text-b24-text-muted">({filteredAgents.length} agents)</span>
            </h2>
            <div className="flex items-center space-x-2">
              {['All', ...TEAMS].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterTeam(t)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    filterTeam === t
                      ? 'bg-b24-blue text-white'
                      : 'bg-b24-surface2 text-b24-text-muted hover:text-b24-text border border-b24-border'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Bitrix ID</th>
                <th className="px-5 py-3">Team</th>
                <th className="px-5 py-3">WhatsApp</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-b24-border-light">
              {loadingAgents ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-b24-text-muted">Loading roster...</td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-b24-text-muted">No agents configured yet.</p>
                    <p className="text-b24-text-light text-xs mt-1">Add agents using the form on the right.</p>
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-b24-surface2 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-b24-blue-light flex items-center justify-center text-b24-blue font-semibold text-sm flex-shrink-0">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-b24-text">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-b24-blue font-mono text-xs">#{agent.bitrix_user_id}</td>
                    <td className="px-5 py-3.5 text-b24-text-muted">{agent.team}</td>
                    <td className="px-5 py-3.5 text-b24-text-muted text-xs font-mono">
                      {agent.whatsapp_phone || <span className="text-b24-text-light italic">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleActive(agent.id, agent.is_active)}
                        className={agent.is_active ? 'badge-active' : 'badge-inactive'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${agent.is_active ? 'bg-b24-green' : 'bg-b24-red'}`} />
                        {agent.is_active ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => startEdit(agent)}
                          className="text-b24-blue hover:text-b24-blue-dark text-xs font-medium"
                        >
                          Edit
                        </button>
                        <span className="text-b24-border">|</span>
                        <button
                          onClick={() => deleteAgent(agent.id)}
                          className="text-b24-red hover:text-red-700 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add / Edit Agent Form */}
        <div className="card p-5">
          <h2 className="font-semibold text-b24-text mb-4">
            {editingId ? 'Edit Agent' : 'Add Agent'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Bitrix User Dropdown */}
            {!editingId && (
              <div>
                <label className="block text-xs font-semibold text-b24-text-muted uppercase tracking-wide mb-1.5">
                  Select from Bitrix24
                </label>
                {loadingUsers ? (
                  <div className="input-field text-b24-text-muted">Loading users from Bitrix24...</div>
                ) : bitrixUsers.length === 0 ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Bitrix User ID (manual)"
                      value={form.bitrix_user_id}
                      onChange={(e) => setForm((f) => ({ ...f, bitrix_user_id: e.target.value }))}
                    />
                    <p className="text-xs text-b24-text-light">Login via Bitrix24 OAuth to load the user picker.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Search by name or department..."
                      value={searchDept}
                      onChange={(e) => setSearchDept(e.target.value)}
                    />
                    <select
                      className="select-field"
                      value={form.bitrix_user_id}
                      onChange={(e) => handleSelectBitrixUser(e.target.value)}
                    >
                      <option value="">— Choose a user —</option>
                      {Object.entries(filteredDepts).map(([dept, users]) => (
                        <optgroup key={dept} label={dept}>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email || `ID: ${u.id}`})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-b24-text-muted uppercase tracking-wide mb-1.5">
                Agent Name
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Team */}
            <div>
              <label className="block text-xs font-semibold text-b24-text-muted uppercase tracking-wide mb-1.5">
                Rotation Team
              </label>
              <select
                className="select-field"
                value={form.team}
                onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
              >
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* WhatsApp Phone */}
            <div>
              <label className="block text-xs font-semibold text-b24-text-muted uppercase tracking-wide mb-1.5">
                WhatsApp Phone
                <span className="ml-1 text-b24-text-light normal-case font-normal">(with country code)</span>
              </label>
              <input
                type="text"
                className="input-field font-mono"
                placeholder="e.g. 923001234567"
                value={form.whatsapp_phone}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp_phone: e.target.value }))}
              />
              <p className="text-xs text-b24-text-light mt-1">No + sign. Used for WA assignment alerts.</p>
            </div>

            <div className="flex items-center space-x-3 pt-1">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Saving...' : editingId ? 'Update Agent' : 'Add to Rotation'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>

          {bitrixUsers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-b24-border-light">
              <div className="flex items-center space-x-2 text-xs text-b24-text-muted">
                <svg className="w-3.5 h-3.5 text-b24-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{bitrixUsers.length} users loaded from Bitrix24</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
