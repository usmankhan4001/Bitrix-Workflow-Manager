import React, { useState, useEffect } from 'react';

const API = () => import.meta.env.VITE_API_URL ?? '';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TEAMS = ['B2C', 'Sales Executives', 'Telly Sales', 'B2B'];

// ── Tooltip ───────────────────────────────────────────────────────────────────
const Tip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', border: '1px solid var(--b24-divider)', borderRadius: 6,
          padding: '7px 11px', fontSize: 12, color: 'var(--b24-text)', zIndex: 50,
          pointerEvents: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          maxWidth: 280, whiteSpace: 'pre-line',
        }}>
          {text}
        </span>
      )}
    </span>
  );
};

const HelpIcon: React.FC<{ text: string }> = ({ text }) => (
  <Tip text={text}>
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--b24-text-faint)',
      color: 'var(--b24-text-faint)', fontSize: 9, fontWeight: 700, cursor: 'help', flexShrink: 0,
    }}>?</span>
  </Tip>
);

// ── Section ───────────────────────────────────────────────────────────────────
const Section: React.FC<{ icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }> = ({ icon, title, desc, children }) => (
  <div>
    <div className="b24-section-top" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--b24-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--b24-primary)', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--b24-text)', marginBottom: 2 }}>{title}</p>
        <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>{desc}</p>
      </div>
    </div>
    <div className="b24-section-body" style={{ padding: '0 22px' }}>{children}</div>
  </div>
);

// ── FormRow ───────────────────────────────────────────────────────────────────
const FormRow: React.FC<{ label: string; desc?: string; tip?: string; right: React.ReactNode }> = ({ label, desc, tip, right }) => (
  <div className="b24-form-row">
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: desc ? 3 : 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--b24-text)' }}>{label}</p>
        {tip && <HelpIcon text={tip} />}
      </div>
      {desc && <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>{desc}</p>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{right}</div>
  </div>
);

const SaveBtn: React.FC<{ onClick: () => void; saving: boolean }> = ({ onClick, saving }) => (
  <button onClick={onClick} disabled={saving} className="b24-btn b24-btn-secondary" style={{ height: 28, fontSize: 12, padding: '0 12px' }}>
    {saving ? 'Saving…' : 'Save'}
  </button>
);

// ── Escalation Flow Diagram ───────────────────────────────────────────────────
const EscalationDiagram: React.FC = () => (
  <div style={{ padding: '14px 0 6px' }}>
    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--b24-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      How escalation works
    </p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 8 }}>
      {[
        { label: 'Lead arrives', sub: 'Auto-assigned to next agent', color: 'var(--b24-primary-dim)', border: 'var(--b24-primary-ring)', text: 'var(--b24-primary)' },
        { arrow: true },
        { label: 'SLA expires', sub: 'Agent didn\'t handle it in time', color: 'rgba(224,152,0,0.1)', border: 'rgba(224,152,0,0.3)', text: '#e09800' },
        { arrow: true },
        { label: 'Escalation Manager', sub: 'Lead reassigned to them', color: 'rgba(242,71,61,0.1)', border: 'rgba(242,71,61,0.3)', text: 'var(--b24-red)' },
        { arrow: true },
        { label: 'Manager reassigns', sub: 'New agent gets a fresh task', color: 'var(--b24-green-dim)', border: 'var(--b24-green-ring)', text: 'var(--b24-green)' },
      ].map((item: any, i) => item.arrow
        ? <span key={i} style={{ color: 'var(--b24-text-faint)', margin: '0 6px', fontSize: 16 }}>→</span>
        : (
          <div key={i} style={{
            padding: '8px 12px', borderRadius: 8,
            background: item.color, border: `1px solid ${item.border}`,
            minWidth: 130,
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: item.text, marginBottom: 2 }}>{item.label}</p>
            <p style={{ fontSize: 11, color: 'var(--b24-text-muted)' }}>{item.sub}</p>
          </div>
        )
      )}
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
interface BitrixUser { id: string; name: string; active: boolean; }
interface BitrixDept { id: string; name: string; }

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [bitrixUsers, setBitrixUsers] = useState<BitrixUser[]>([]);
  const [departments, setDepartments] = useState<BitrixDept[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API()}/api/workflow/settings`).then(r => r.ok ? r.json() : {}),
      fetch(`${API()}/api/bitrix/webhook-users`).then(r => r.ok ? r.json() : { users: [], departments: [] }),
    ]).then(([s, u]) => {
      setSettings(s);
      setBitrixUsers((u.users || []).filter((u: BitrixUser) => u.active));
      setDepartments(u.departments || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async (key: string, value: string) => {
    setSaving(key);
    try {
      await fetch(`${API()}/api/workflow/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
      setSettings(s => ({ ...s, [key]: value }));
      showToast('success', 'Saved');
    } catch (e) { console.error(e); } finally { setSaving(null); }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg }); setTimeout(() => setToast(null), 2500);
  };

  const offDays: number[] = (() => { try { return JSON.parse(settings.NOT_ALLOWED_DAYS || '[0,6]'); } catch { return [0, 6]; } })();
  const toggleOffDay = (i: number) => {
    const next = offDays.includes(i) ? offDays.filter(d => d !== i) : [...offDays, i].sort();
    setSettings(s => ({ ...s, NOT_ALLOWED_DAYS: JSON.stringify(next) }));
  };

  const eligibleDeptIds: string[] = (() => { try { return JSON.parse(settings.ELIGIBLE_DEPT_IDS || '[]'); } catch { return []; } })();
  const toggleEligibleDept = (id: string) => {
    const next = eligibleDeptIds.includes(id) ? eligibleDeptIds.filter(d => d !== id) : [...eligibleDeptIds, id];
    setSettings(s => ({ ...s, ELIGIBLE_DEPT_IDS: JSON.stringify(next) }));
  };

  const managerName = bitrixUsers.find(u => u.id === settings.WORKFLOW_MANAGER_ID)?.name;
  const workflowEnabled = settings.WORKFLOW_ENABLED !== 'false';
  const toggleEngine = () => save('WORKFLOW_ENABLED', workflowEnabled ? 'false' : 'true');

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--b24-bg)' }}>
      <span style={{ color: 'var(--b24-text-muted)', fontSize: 13 }}>Loading settings…</span>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="b24-navbar">
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b24-text)' }}>Settings</h1>
        <button
          onClick={toggleEngine}
          disabled={saving === 'WORKFLOW_ENABLED'}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 14px 5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: workflowEnabled ? 'var(--b24-green-dim)' : 'rgba(180,40,30,0.10)',
            color: workflowEnabled ? 'var(--b24-green)' : 'var(--b24-red)',
            fontWeight: 600, fontSize: 12, transition: 'background 0.2s, color 0.2s',
            outline: `1px solid ${workflowEnabled ? 'var(--b24-green-ring)' : 'rgba(180,40,30,0.25)'}`,
          }}
        >
          {/* Toggle knob */}
          <span style={{
            width: 34, height: 18, borderRadius: 9, position: 'relative', flexShrink: 0,
            background: workflowEnabled ? 'var(--b24-green)' : '#ccc',
            transition: 'background 0.2s',
            display: 'inline-block',
          }}>
            <span style={{
              position: 'absolute', top: 2,
              left: workflowEnabled ? 18 : 2,
              width: 14, height: 14, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </span>
          {saving === 'WORKFLOW_ENABLED' ? 'Saving…' : workflowEnabled ? 'Engine Running' : 'Engine Paused'}
        </button>
      </div>

      {!workflowEnabled && (
        <div style={{
          background: 'rgba(180,40,30,0.08)', borderBottom: '1px solid rgba(180,40,30,0.2)',
          padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--b24-red)', flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p style={{ fontSize: 13, color: 'var(--b24-red)', fontWeight: 500 }}>
            Workflow engine is <strong>paused</strong> — no leads are being assigned and the cron job is inactive. Toggle "Engine Running" above to resume.
          </p>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 100, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.type === 'success' ? 'var(--b24-green-dim)' : 'var(--b24-red-dim)', border: `1px solid ${toast.type === 'success' ? 'var(--b24-green-ring)' : 'var(--b24-red-ring)'}`, color: toast.type === 'success' ? 'var(--b24-green)' : 'var(--b24-red)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          {toast.msg}
        </div>
      )}

      <div className="b24-two-col" style={{ alignItems: 'start' }}>

        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Business Hours */}
        <Section
          icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          title="Business Hours"
          desc="Leads that arrive outside these hours are held and assigned automatically when the day starts"
        >
          <FormRow
            label="Start Time"
            tip="Leads that arrive before this time are held in a queue and assigned all at once when the clock hits this time."
            right={<><input type="time" value={settings.WORKFLOW_START_TIME || '09:00'} onChange={e => setSettings(s => ({ ...s, WORKFLOW_START_TIME: e.target.value }))} className="b24-input" style={{ width: 120 }} /><SaveBtn onClick={() => save('WORKFLOW_START_TIME', settings.WORKFLOW_START_TIME || '09:00')} saving={saving === 'WORKFLOW_START_TIME'} /></>}
          />
          <FormRow
            label="End Time"
            tip="Leads that arrive after this time are queued and will be assigned the next morning at Start Time."
            right={<><input type="time" value={settings.WORKFLOW_END_TIME || '18:00'} onChange={e => setSettings(s => ({ ...s, WORKFLOW_END_TIME: e.target.value }))} className="b24-input" style={{ width: 120 }} /><SaveBtn onClick={() => save('WORKFLOW_END_TIME', settings.WORKFLOW_END_TIME || '18:00')} saving={saving === 'WORKFLOW_END_TIME'} /></>}
          />
          <FormRow
            label="SLA Hours"
            desc="How many hours an agent has to act on a lead before it's flagged as overdue."
            tip="If an agent hasn't updated or resolved a lead within this many hours, the system sends an overdue WhatsApp alert and may escalate it to the manager."
            right={<><input type="number" min={1} max={168} value={settings.SLA_HOURS || '24'} onChange={e => setSettings(s => ({ ...s, SLA_HOURS: e.target.value }))} className="b24-input" style={{ width: 72, textAlign: 'center' }} /><span style={{ fontSize: 12, color: 'var(--b24-text-faint)' }}>hours</span><SaveBtn onClick={() => save('SLA_HOURS', settings.SLA_HOURS || '24')} saving={saving === 'SLA_HOURS'} /></>}
          />
        </Section>

        {/* Off Days */}
        <Section
          icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          title="Off Days"
          desc="Leads arriving on these days are held and assigned on the next working day"
        >
          <div style={{ padding: '16px 0' }}>
            <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', marginBottom: 12 }}>
              Click a day to mark it as off. <strong style={{ color: 'var(--b24-text)' }}>Highlighted</strong> = off day (leads queue). Unhighlighted = working day.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {DAYS.map((day, i) => (
                <button key={day} type="button" onClick={() => toggleOffDay(i)}
                  className={`b24-btn ${offDays.includes(i) ? 'b24-btn-primary' : 'b24-btn-secondary'}`}
                  style={{ height: 30, fontSize: 12, padding: '0 14px' }}>
                  {day.slice(0, 3)}
                  {offDays.includes(i) && <span style={{ marginLeft: 5, fontSize: 10 }}>off</span>}
                </button>
              ))}
            </div>
            <button onClick={() => save('NOT_ALLOWED_DAYS', settings.NOT_ALLOWED_DAYS || '[0,6]')} disabled={saving === 'NOT_ALLOWED_DAYS'} className="b24-btn b24-btn-primary">
              {saving === 'NOT_ALLOWED_DAYS' ? 'Saving…' : 'Save Off Days'}
            </button>
          </div>
        </Section>

        </div>{/* end LEFT */}

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Assignment Scope */}
        <Section
          icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          title="Assignment Scope"
          desc="Which team and departments receive incoming leads"
        >
          <FormRow
            label="Lead Assignment Team"
            desc={`Incoming leads go to agents tagged with this team name. Currently: "${settings.LEAD_ASSIGNMENT_TEAM || 'B2C'}"`}
            tip="When a new lead arrives (from Bitrix24 automation or the late-lead queue), it is assigned to the next active agent in THIS team's rotation. Make sure your agents on the Team page have this exact team name."
            right={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="b24-select"
                  style={{ width: 160 }}
                  value={settings.LEAD_ASSIGNMENT_TEAM || 'B2C'}
                  onChange={e => setSettings(s => ({ ...s, LEAD_ASSIGNMENT_TEAM: e.target.value }))}
                >
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <SaveBtn onClick={() => save('LEAD_ASSIGNMENT_TEAM', settings.LEAD_ASSIGNMENT_TEAM || 'B2C')} saving={saving === 'LEAD_ASSIGNMENT_TEAM'} />
              </div>
            }
          />

          <div style={{ padding: '14px 0 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--b24-text)', marginBottom: 2 }}>
                  Eligible Departments
                </p>
                <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>
                  {eligibleDeptIds.length === 0
                    ? 'All Bitrix24 departments appear in the user picker'
                    : `${eligibleDeptIds.length} department${eligibleDeptIds.length > 1 ? 's' : ''} selected — user picker is pre-filtered to these`}
                </p>
              </div>
              <SaveBtn onClick={() => save('ELIGIBLE_DEPT_IDS', settings.ELIGIBLE_DEPT_IDS || '[]')} saving={saving === 'ELIGIBLE_DEPT_IDS'} />
            </div>
            {departments.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--b24-text-faint)', fontStyle: 'italic' }}>No departments loaded — check BITRIX_WEBHOOK_TOKEN.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {departments.map(d => {
                  const checked = eligibleDeptIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleEligibleDept(d.id)}
                      className={`b24-btn ${checked ? 'b24-btn-primary' : 'b24-btn-secondary'}`}
                      style={{ height: 28, fontSize: 12, padding: '0 12px', gap: 5, display: 'flex', alignItems: 'center' }}
                    >
                      {checked && (
                        <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                      {d.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Section>

        {/* Escalation Manager */}
        <Section
          icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
          title="Escalation & Assignment Rules"
          desc="What happens when a lead isn't handled in time"
        >
          <EscalationDiagram />

          <FormRow
            label="Escalation Manager"
            desc={managerName ? `Currently: ${managerName}` : 'No manager selected yet'}
            tip="When a lead is overdue and has too many open tasks, it gets automatically reassigned to this person. They can then hand it off to someone on the team."
            right={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {bitrixUsers.length > 0
                  ? (
                    <select
                      className="b24-select"
                      style={{ width: 200 }}
                      value={settings.WORKFLOW_MANAGER_ID || ''}
                      onChange={e => setSettings(s => ({ ...s, WORKFLOW_MANAGER_ID: e.target.value }))}
                    >
                      <option value="">— Choose manager —</option>
                      {bitrixUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="b24-input"
                      style={{ width: 80, textAlign: 'center', fontFamily: 'monospace' }}
                      placeholder="User ID"
                      value={settings.WORKFLOW_MANAGER_ID || ''}
                      onChange={e => setSettings(s => ({ ...s, WORKFLOW_MANAGER_ID: e.target.value }))}
                    />
                  )
                }
                <SaveBtn onClick={() => save('WORKFLOW_MANAGER_ID', settings.WORKFLOW_MANAGER_ID || '')} saving={saving === 'WORKFLOW_MANAGER_ID'} />
              </div>
            }
          />

          <FormRow
            label="Max open tasks before escalating"
            desc="If a lead already has this many unresolved tasks, it gets sent straight to the manager."
            tip={`Example: if set to 2, and a lead already has 2 open tasks without being resolved, it skips the agent queue and goes to the Escalation Manager directly.`}
            right={<><input type="number" min={1} max={10} className="b24-input" style={{ width: 72, textAlign: 'center' }} value={settings.MAX_TASKS_BEFORE_ESCALATION || '2'} onChange={e => setSettings(s => ({ ...s, MAX_TASKS_BEFORE_ESCALATION: e.target.value }))} /><span style={{ fontSize: 12, color: 'var(--b24-text-faint)' }}>tasks</span><SaveBtn onClick={() => save('MAX_TASKS_BEFORE_ESCALATION', settings.MAX_TASKS_BEFORE_ESCALATION || '2')} saving={saving === 'MAX_TASKS_BEFORE_ESCALATION'} /></>}
          />

          <FormRow
            label="Excluded Source IDs"
            desc="Leads from these Bitrix24 sources will be silently ignored — never assigned to anyone."
            tip={"Find Source IDs in Bitrix24 → CRM → Settings → Lead Sources.\nEnter them comma-separated, e.g.: UC_NNO79X, CALL\nUseful for ignoring junk or internal sources."}
            right={<>
              <input
                type="text"
                className="b24-input"
                style={{ width: 180, fontFamily: 'monospace', fontSize: 12 }}
                placeholder="e.g. UC_NNO79X, CALL"
                value={settings.EXCLUDED_SOURCES_RAW ?? (() => { try { return JSON.parse(settings.EXCLUDED_SOURCES || '[]').join(', '); } catch { return ''; } })()}
                onChange={e => setSettings(s => ({ ...s, EXCLUDED_SOURCES_RAW: e.target.value }))}
              />
              <SaveBtn onClick={() => { const arr = (settings.EXCLUDED_SOURCES_RAW || '').split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean); save('EXCLUDED_SOURCES', JSON.stringify(arr)); }} saving={saving === 'EXCLUDED_SOURCES'} />
            </>}
          />
        </Section>

        </div>{/* end RIGHT */}

      </div>{/* end two-col */}
      </div>{/* end scroll */}
    </div>
  );
};

export default Settings;
