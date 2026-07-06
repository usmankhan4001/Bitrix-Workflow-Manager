import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API = () => import.meta.env.VITE_API_URL ?? '';

interface Agent {
  id: string; bitrix_user_id: string; name: string;
  team: string; whatsapp_phone?: string; is_active: boolean; sort_order: number;
}
interface BitrixUser {
  id: string; name: string; email: string;
  department_name: string; phone: string; active: boolean;
}

const TEAMS = ['Sales Executives', 'Telly Sales', 'B2B', 'B2C', 'Marketing'];
const AVATAR_COLORS = ['#1587fa','#1cae6a','#e09800','#9b59b6','#e74c3c','#1abc9c','#e67e22'];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// ── Tooltip ───────────────────────────────────────────────────────────────────
const Tip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)', background: 'var(--b24-text)', color: 'var(--b24-card)',
          border: '1px solid var(--b24-divider)', borderRadius: 6, padding: '5px 10px',
          fontSize: 11, whiteSpace: 'nowrap', zIndex: 100,
          pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>{text}</span>
      )}
    </span>
  );
};

// ── Sortable Member Row ───────────────────────────────────────────────────────
const MemberRow: React.FC<{
  agent: Agent; index: number;
  onToggle: (id: string, cur: boolean) => void;
  onDelete: (id: string, name: string) => void;
  saving: string | null;
}> = ({ agent, index, onToggle, onDelete, saving }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: agent.id });
  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      ref={setNodeRef}
      className="b24-member-row"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: 'default',
      }}
    >
      {/* Drag handle */}
      <Tip text="Drag to reorder priority">
        <div
          {...attributes} {...listeners}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            color: 'var(--b24-text-faint)',
            display: 'flex', alignItems: 'center',
            padding: '4px 2px', flexShrink: 0, touchAction: 'none',
          }}
        >
          <svg width="12" height="16" viewBox="0 0 12 20" fill="currentColor">
            <circle cx="4" cy="4" r="1.5"/><circle cx="8" cy="4" r="1.5"/>
            <circle cx="4" cy="10" r="1.5"/><circle cx="8" cy="10" r="1.5"/>
            <circle cx="4" cy="16" r="1.5"/><circle cx="8" cy="16" r="1.5"/>
          </svg>
        </div>
      </Tip>

      {/* Priority badge */}
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: index === 0 ? 'var(--b24-primary)' : 'var(--b24-btn-sec-bg)',
        color: index === 0 ? '#fff' : 'var(--b24-text-faint)',
        fontSize: 10, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{index + 1}</div>

      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: agent.is_active ? avatarColor(agent.name) : 'var(--b24-btn-sec-bg)',
        color: agent.is_active ? '#fff' : 'var(--b24-text-faint)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 13,
        opacity: agent.is_active ? 1 : 0.5,
      }}>{initials}</div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: agent.is_active ? 'var(--b24-text)' : 'var(--b24-text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{agent.name}</div>
        <div style={{ fontSize: 11, color: 'var(--b24-text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{agent.team}</span>
          {agent.whatsapp_phone && (
            <span style={{ color: 'var(--b24-green)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.549 4.126 1.516 5.865L.057 23.1a.75.75 0 00.914.914l5.235-1.459A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.51-5.163-1.4l-.369-.219-3.828 1.067 1.025-3.743-.24-.384A9.954 9.954 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              WA
            </span>
          )}
        </div>
      </div>

      {/* Status label */}
      <div style={{ fontSize: 11, color: agent.is_active ? 'var(--b24-green)' : 'var(--b24-text-faint)', flexShrink: 0, minWidth: 90, textAlign: 'right' }}>
        {agent.is_active ? (index === 0 ? '← Next in line' : `#${index + 1} in queue`) : 'Paused'}
      </div>

      {/* Active toggle */}
      <Tip text={agent.is_active ? 'Pause — skip in rotation' : 'Activate — include in rotation'}>
        <button
          onClick={() => onToggle(agent.id, agent.is_active)}
          disabled={saving === agent.id + '_toggle'}
          style={{
            width: 38, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: agent.is_active ? 'var(--b24-green)' : 'var(--b24-btn-sec-bg)',
            position: 'relative', flexShrink: 0, transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: 2,
            left: agent.is_active ? 20 : 2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#fff', transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </Tip>

      {/* Delete */}
      <button
        onClick={() => onDelete(agent.id, agent.name)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--b24-text-faint)', padding: 4, borderRadius: 4, display: 'flex', flexShrink: 0 }}
        title="Remove from rotation"
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// ── Add Person Panel (right column) ──────────────────────────────────────────
const AddPanel: React.FC<{ onAdded: () => void; existingIds: string[] }> = ({ onAdded, existingIds }) => {
  const [users, setUsers] = useState<BitrixUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [team, setTeam] = useState(TEAMS[0]);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`${API()}/api/bitrix/webhook-users`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        return data;
      })
      .then(d => { setUsers(d.users || []); setUsersError(''); })
      .catch(e => setUsersError(e.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => u.active && !existingIds.includes(u.id) &&
      (u.name.toLowerCase().includes(q) || u.department_name?.toLowerCase().includes(q)));
  }, [users, search, existingIds]);

  const grouped = useMemo(() => {
    const g: Record<string, BitrixUser[]> = {};
    for (const u of filtered) {
      const d = u.department_name || 'No Department';
      if (!g[d]) g[d] = [];
      g[d].push(u);
    }
    return g;
  }, [filtered]);

  const selectedUser = users.find(u => u.id === selected);

  const handleAdd = async () => {
    if (!selected || !selectedUser) return;
    setSubmitting(true);
    try {
      await fetch(`${API()}/api/workflow/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bitrix_user_id: selected, name: selectedUser.name, team, whatsapp_phone: phone || undefined }),
      });
      setSelected(''); setPhone(''); setSearch('');
      setSuccess(true); setTimeout(() => setSuccess(false), 2000);
      onAdded();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* How it works */}
      <div style={{ background: 'var(--b24-primary-dim)', border: '1px solid var(--b24-primary-ring)', borderRadius: 8, padding: '12px 14px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--b24-primary)', marginBottom: 6 }}>How assignment works</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['Lead arrives in Bitrix24', 'Person #1 gets assigned', 'Next lead → Person #2', 'Loops back to #1'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--b24-text-muted)' }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--b24-primary)', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
              {s}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'var(--b24-text-faint)', marginTop: 8 }}>Drag names on the left to change order.</p>
      </div>

      {/* Add form */}
      <div className="b24-card" style={{ overflow: 'visible' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--b24-divider)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)' }}>Add to rotation</p>
        </div>
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Search + select */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
              Person
            </label>
            {loading ? (
              <div className="b24-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--b24-text-faint)', fontSize: 12, gap: 6 }}>
                <svg className="b24-spin" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                Loading users…
              </div>
            ) : usersError ? (
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--b24-red-dim)', border: '1px solid var(--b24-red-ring)', fontSize: 11, color: 'var(--b24-red)' }}>
                ⚠ {usersError}
              </div>
            ) : (
              <>
                <input className="b24-input" style={{ marginBottom: 6 }} placeholder="Search name or department…" value={search} onChange={e => setSearch(e.target.value)} />
                <select className="b24-select" value={selected} onChange={e => { setSelected(e.target.value); const u = users.find(u => u.id === e.target.value); if (u?.phone) setPhone(u.phone); }}>
                  <option value="">— Choose a person —</option>
                  {Object.entries(grouped).map(([dept, us]) => (
                    <optgroup key={dept} label={dept}>
                      {us.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Team */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Group</label>
            <select className="b24-select" value={team} onChange={e => setTeam(e.target.value)}>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* WhatsApp */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
              WhatsApp <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(optional)</span>
            </label>
            <input type="text" className="b24-input" style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="923001234567" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <button onClick={handleAdd} disabled={!selected || submitting} className="b24-btn b24-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 2 }}>
            {submitting ? 'Adding…' : success ? '✓ Added!' : '+ Add to rotation'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const Assignment: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filterTeam, setFilterTeam] = useState('All');

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API()}/api/workflow/agents`);
      if (r.ok) setAgents(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const allTeams = useMemo(() => ['All', ...Array.from(new Set(agents.map(a => a.team)))], [agents]);
  const displayed = filterTeam === 'All' ? agents : agents.filter(a => a.team === filterTeam);
  const activeCount = agents.filter(a => a.is_active).length;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = agents.findIndex(a => a.id === active.id);
    const newIndex = agents.findIndex(a => a.id === over.id);
    const reordered = arrayMove(agents, oldIndex, newIndex);
    setAgents(reordered);
    try {
      await fetch(`${API()}/api/workflow/agents/reorder`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map(a => a.id) }),
      });
    } catch (e) { console.error(e); fetchAgents(); }
  };

  const toggleActive = async (id: string, cur: boolean) => {
    setSaving(id + '_toggle');
    try {
      await fetch(`${API()}/api/workflow/agents/${id}/active`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !cur }),
      });
      setAgents(prev => prev.map(a => a.id === id ? { ...a, is_active: !cur } : a));
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  const deleteAgent = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the rotation?`)) return;
    await fetch(`${API()}/api/workflow/agents/${id}`, { method: 'DELETE' });
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <div className="b24-navbar">
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b24-text)' }}>Assignment Rotation</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="b24-badge b24-badge-success">{activeCount} active</span>
          <span className="b24-badge b24-badge-neutral">{agents.length} total</span>
        </div>
      </div>

      {/* Team filter */}
      {allTeams.length > 2 && (
        <div style={{ padding: '8px 20px', background: 'var(--b24-card)', borderBottom: '1px solid var(--b24-divider)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {allTeams.map(t => (
            <button key={t} onClick={() => setFilterTeam(t)}
              className={`b24-btn ${filterTeam === t ? 'b24-btn-primary' : 'b24-btn-ghost'}`}
              style={{ height: 26, fontSize: 11, padding: '0 10px' }}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Two-column body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div className="b24-two-col">

          {/* LEFT — Member list */}
          <div className="b24-card" style={{ overflow: 'visible' }}>
            {/* List header */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--b24-divider)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, flexShrink: 0 }} />
              <div style={{ width: 20, flexShrink: 0 }} />
              <div style={{ width: 36, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 90, textAlign: 'right' }}>Status</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 38, textAlign: 'center' }}>On</span>
              <div style={{ width: 21 }} />
            </div>

            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--b24-text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg className="b24-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="var(--b24-primary)" strokeWidth="3" strokeOpacity="0.2" />
                  <path fill="var(--b24-primary)" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading team…
              </div>
            ) : displayed.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ color: 'var(--b24-text-muted)', fontWeight: 600, marginBottom: 4 }}>No one added yet</p>
                <p style={{ color: 'var(--b24-text-faint)', fontSize: 12 }}>Use the panel on the right to add team members.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={displayed.map(a => a.id)} strategy={verticalListSortingStrategy}>
                  {displayed.map((agent, idx) => (
                    <MemberRow key={agent.id} agent={agent} index={idx} onToggle={toggleActive} onDelete={deleteAgent} saving={saving} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* RIGHT — Add panel */}
          <AddPanel onAdded={fetchAgents} existingIds={agents.map(a => a.bitrix_user_id)} />
        </div>
      </div>
    </div>
  );
};

export default Assignment;
