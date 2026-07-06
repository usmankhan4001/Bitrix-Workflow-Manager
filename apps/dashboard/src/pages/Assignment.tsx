import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Agent {
  id: string;
  bitrix_user_id: string;
  name: string;
  team: string;
  whatsapp_phone?: string;
  is_active: boolean;
  sort_order: number;
}

interface BitrixUser {
  id: string;
  name: string;
  email: string;
  department_name: string;
  phone: string;
  avatar: string | null;
  active: boolean;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const Tip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a1a1a',
          border: '1px solid var(--b24-divider)',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
          color: 'var(--b24-text)',
          whiteSpace: 'nowrap',
          zIndex: 50,
          pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          maxWidth: 260,
          whiteSpaceCollapse: 'collapse' as any,
          textWrap: 'wrap' as any,
        }}>
          {text}
          <span style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid var(--b24-divider)',
          }} />
        </span>
      )}
    </span>
  );
};

const HelpIcon: React.FC<{ text: string }> = ({ text }) => (
  <Tip text={text}>
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 15,
      height: 15,
      borderRadius: '50%',
      border: '1px solid var(--b24-text-faint)',
      color: 'var(--b24-text-faint)',
      fontSize: 10,
      fontWeight: 700,
      cursor: 'help',
      flexShrink: 0,
    }}>?</span>
  </Tip>
);

// ── Sortable Agent Row ────────────────────────────────────────────────────────
const SortableRow: React.FC<{
  agent: Agent;
  index: number;
  onToggle: (id: string, cur: boolean) => void;
  onDelete: (id: string, name: string) => void;
  saving: string | null;
}> = ({ agent, index, onToggle, onDelete, saving }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: agent.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: isDragging ? 'var(--b24-card-hover)' : 'var(--b24-card)',
        border: '1px solid var(--b24-divider)',
        borderRadius: 8,
        marginBottom: 6,
        userSelect: 'none',
      }}
    >
      {/* Priority badge */}
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: index === 0 ? 'var(--b24-primary)' : 'var(--b24-divider)',
        color: index === 0 ? '#fff' : 'var(--b24-text-muted)',
        fontSize: 11,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {index + 1}
      </div>

      {/* Drag handle */}
      <Tip text="Drag to change who gets leads first — #1 is next in line">
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            color: 'var(--b24-text-faint)',
            display: 'flex',
            alignItems: 'center',
            padding: '2px 4px',
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
          </svg>
        </div>
      </Tip>

      {/* Avatar */}
      <div style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: agent.is_active ? 'var(--b24-primary-dim)' : 'rgba(130,139,149,0.15)',
        color: agent.is_active ? 'var(--b24-primary)' : 'var(--b24-text-faint)',
        fontWeight: 700,
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {agent.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + team + status text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: agent.is_active ? 'var(--b24-text)' : 'var(--b24-text-muted)', marginBottom: 2 }}>
          {agent.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--b24-text-faint)' }}>
          {agent.team}
          {agent.whatsapp_phone && (
            <span style={{ marginLeft: 8, color: 'var(--b24-green)', opacity: 0.8 }}>· WhatsApp ✓</span>
          )}
        </div>
      </div>

      {/* Plain-english status */}
      <div style={{ fontSize: 11, color: agent.is_active ? 'var(--b24-green)' : 'var(--b24-text-faint)', textAlign: 'right', minWidth: 130, flexShrink: 0 }}>
        {agent.is_active
          ? index === 0
            ? '← Gets the next lead'
            : `Gets lead after ${index} other${index > 1 ? 's' : ''}`
          : 'Paused — skipped'}
      </div>

      {/* Active toggle */}
      <Tip text={agent.is_active ? 'Click to pause — this person will be skipped until re-activated' : 'Click to activate — this person will receive leads again'}>
        <button
          onClick={() => onToggle(agent.id, agent.is_active)}
          disabled={saving === agent.id + '_toggle'}
          style={{
            width: 40,
            height: 22,
            borderRadius: 11,
            background: agent.is_active ? 'var(--b24-green)' : '#3a3a3a',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3,
            left: agent.is_active ? 21 : 3,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
      </Tip>

      {/* Delete */}
      <button
        onClick={() => onDelete(agent.id, agent.name)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--b24-text-faint)', padding: '4px', borderRadius: 4, flexShrink: 0, display: 'flex' }}
        title="Remove from rotation"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};

// ── Add Person Panel ──────────────────────────────────────────────────────────
const TEAMS = ['Sales Executives', 'Telly Sales', 'B2B', 'B2C', 'Marketing'];

const AddPersonPanel: React.FC<{ onAdded: () => void; existingIds: string[] }> = ({ onAdded, existingIds }) => {
  const [bitrixUsers, setBitrixUsers] = useState<BitrixUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [team, setTeam] = useState(TEAMS[0]);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API()}/api/bitrix/webhook-users`)
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => setBitrixUsers(d.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bitrixUsers.filter(u =>
      u.active &&
      !existingIds.includes(u.id) &&
      (u.name.toLowerCase().includes(q) || u.department_name?.toLowerCase().includes(q))
    );
  }, [bitrixUsers, search, existingIds]);

  const grouped = useMemo(() => {
    const g: Record<string, BitrixUser[]> = {};
    for (const u of filtered) {
      const d = u.department_name || 'No Department';
      if (!g[d]) g[d] = [];
      g[d].push(u);
    }
    return g;
  }, [filtered]);

  const selectedUser = bitrixUsers.find(u => u.id === selected);

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
      onAdded();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="b24-btn b24-btn-secondary"
        style={{ width: '100%', justifyContent: 'center', gap: 8, height: 38, marginTop: 4 }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add person to rotation
      </button>
    );
  }

  return (
    <div style={{ border: '1px solid var(--b24-primary-ring)', borderRadius: 10, background: 'var(--b24-card)', padding: '16px', marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)' }}>Add person to rotation</p>
        <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', color: 'var(--b24-text-faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {/* User picker */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
          Select from Bitrix24
        </label>
        {loading ? (
          <div className="b24-input" style={{ color: 'var(--b24-text-faint)', fontSize: 12 }}>Loading Bitrix24 users…</div>
        ) : (
          <>
            <input
              className="b24-input"
              placeholder="Search by name or department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 6 }}
            />
            <select className="b24-select" value={selected} onChange={e => { setSelected(e.target.value); const u = bitrixUsers.find(u => u.id === e.target.value); if (u?.phone) setPhone(u.phone); }}>
              <option value="">— Choose a person —</option>
              {Object.entries(grouped).map(([dept, users]) => (
                <optgroup key={dept} label={dept}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </optgroup>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Team */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
          Assign to group
        </label>
        <select className="b24-select" value={team} onChange={e => setTeam(e.target.value)}>
          {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <p style={{ fontSize: 11, color: 'var(--b24-text-faint)', marginTop: 4 }}>
          Leads are distributed within each group separately.
        </p>
      </div>

      {/* WhatsApp */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--b24-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>
          WhatsApp number <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
        </label>
        <input type="text" className="b24-input" style={{ fontFamily: 'monospace' }} placeholder="e.g. 923001234567" value={phone} onChange={e => setPhone(e.target.value)} />
        <p style={{ fontSize: 11, color: 'var(--b24-text-faint)', marginTop: 4 }}>No + sign. Country code first. Used for automatic WhatsApp alerts.</p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleAdd} disabled={!selected || submitting} className="b24-btn b24-btn-primary" style={{ flex: 1 }}>
          {submitting ? 'Adding…' : 'Add to rotation'}
        </button>
        <button onClick={() => setExpanded(false)} className="b24-btn b24-btn-secondary">Cancel</button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const Assignment: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [reorderPending, setReorderPending] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(() => !localStorage.getItem('wt_dismissed'));
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = agents.findIndex(a => a.id === active.id);
    const newIndex = agents.findIndex(a => a.id === over.id);
    const reordered = arrayMove(agents, oldIndex, newIndex);
    setAgents(reordered);
    setReorderPending(true);

    try {
      await fetch(`${API()}/api/workflow/agents/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map(a => a.id) }),
      });
    } catch (e) { console.error(e); fetchAgents(); }
    finally { setReorderPending(false); }
  };

  const toggleActive = async (id: string, cur: boolean) => {
    setSaving(id + '_toggle');
    try {
      await fetch(`${API()}/api/workflow/agents/${id}/active`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !cur }),
      });
      setAgents(prev => prev.map(a => a.id === id ? { ...a, is_active: !cur } : a));
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  const deleteAgent = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the rotation? They won't receive any more leads.`)) return;
    await fetch(`${API()}/api/workflow/agents/${id}`, { method: 'DELETE' });
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  const activeCount = agents.filter(a => a.is_active).length;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--b24-bg)' }}>
      {/* Navbar */}
      <div className="b24-navbar">
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--b24-text)' }}>Assignment Rotation</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {reorderPending && (
            <span style={{ fontSize: 12, color: 'var(--b24-text-faint)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg className="b24-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Saving order…
            </span>
          )}
          <span className="b24-badge b24-badge-success">{activeCount} active</span>
          <span className="b24-badge b24-badge-neutral">{agents.length} total</span>
        </div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 740 }}>

        {/* Walkthrough banner */}
        {showWalkthrough && (
          <div style={{
            background: 'var(--b24-primary-dim)',
            border: '1px solid var(--b24-primary-ring)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--b24-primary)', marginBottom: 10 }}>
                How does lead assignment work?
              </p>
              <button
                onClick={() => { setShowWalkthrough(false); localStorage.setItem('wt_dismissed', '1'); }}
                style={{ background: 'none', border: 'none', color: 'var(--b24-text-faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
              >×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
              {[
                { step: '1', label: 'Lead arrives in Bitrix24', icon: '📥' },
                { step: '2', label: 'System picks #1 active person in the list below', icon: '🎯' },
                { step: '3', label: 'Lead is auto-assigned. Next lead goes to #2, then #3…', icon: '🔄' },
                { step: '4', label: 'After the last person, it loops back to #1', icon: '✅' },
              ].map((s, i) => (
                <React.Fragment key={s.step}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    <span style={{ fontSize: 12, color: 'var(--b24-text)' }}><strong>Step {s.step}:</strong> {s.label}</span>
                  </div>
                  {i < 3 && <span style={{ color: 'var(--b24-text-faint)', margin: '0 8px' }}>→</span>}
                </React.Fragment>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', marginTop: 10 }}>
              <strong style={{ color: 'var(--b24-text)' }}>Drag</strong> names to reorder priority. <strong style={{ color: 'var(--b24-text)' }}>Toggle</strong> the switch to pause someone without removing them.
            </p>
          </div>
        )}

        {/* How it works explainer */}
        <div style={{
          background: 'var(--b24-card)',
          border: '1px solid var(--b24-divider)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <svg width="16" height="16" fill="none" stroke="var(--b24-primary)" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', flex: 1 }}>
            Leads are handed out <strong style={{ color: 'var(--b24-text)' }}>one by one, in order</strong> — person #1 gets the next lead, then #2, then #3, and it loops back. Drag to reorder. Toggle to pause someone temporarily.
          </p>
          {!showWalkthrough && (
            <button
              onClick={() => { setShowWalkthrough(true); localStorage.removeItem('wt_dismissed'); }}
              style={{ fontSize: 11, color: 'var(--b24-primary)', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              How does this work?
            </button>
          )}
        </div>

        {/* Team filter tabs */}
        {allTeams.length > 2 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {allTeams.map(t => (
              <button key={t} onClick={() => setFilterTeam(t)}
                className={`b24-btn ${filterTeam === t ? 'b24-btn-primary' : 'b24-btn-ghost'}`}
                style={{ height: 28, fontSize: 11, padding: '0 12px' }}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Column headers */}
        {agents.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', marginBottom: 6 }}>
            <div style={{ width: 24, flexShrink: 0 }} />
            <div style={{ width: 28, flexShrink: 0 }} />
            <div style={{ width: 34, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--b24-text-faint)' }}>
              Name
            </div>
            <div style={{ minWidth: 130, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--b24-text-faint)', textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
              Status
              <HelpIcon text="Shows when this person will receive their next lead, based on their position in the list." />
            </div>
            <div style={{ width: 40, flexShrink: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--b24-text-faint)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              On
              <HelpIcon text="Toggle off to pause this person — they stay in the list but are skipped until you turn them back on." />
            </div>
            <div style={{ width: 22, flexShrink: 0 }} />
          </div>
        )}

        {/* Sortable list */}
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--b24-text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg className="b24-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--b24-primary)" strokeWidth="3" strokeOpacity="0.2" />
              <path fill="var(--b24-primary)" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading team…
          </div>
        ) : displayed.length === 0 && agents.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--b24-text-muted)', fontWeight: 600, marginBottom: 6 }}>No one in the rotation yet</p>
            <p style={{ color: 'var(--b24-text-faint)', fontSize: 12 }}>Add team members below to start distributing leads.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={displayed.map(a => a.id)} strategy={verticalListSortingStrategy}>
              {displayed.map((agent, idx) => (
                <SortableRow
                  key={agent.id}
                  agent={agent}
                  index={idx}
                  onToggle={toggleActive}
                  onDelete={deleteAgent}
                  saving={saving}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Add person */}
        <div style={{ marginTop: 8 }}>
          <AddPersonPanel
            onAdded={fetchAgents}
            existingIds={agents.map(a => a.bitrix_user_id)}
          />
        </div>

      </div>
    </div>
  );
};

export default Assignment;
