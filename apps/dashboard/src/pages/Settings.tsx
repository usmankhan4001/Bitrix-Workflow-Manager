import React, { useState, useEffect } from 'react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* Section — matches B24PageCard tinted-alt header + outline-no-accent body */
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

/* FormRow — matches B24FormField + B24Separator */
const FormRow: React.FC<{ label: string; desc?: string; right: React.ReactNode }> = ({ label, desc, right }) => (
  <div className="b24-form-row">
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--b24-text)', marginBottom: desc ? 3 : 0 }}>{label}</p>
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

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, tRes] = await Promise.all([
        fetch(`${API()}/api/workflow/settings`),
        fetch(`${API()}/api/workflow/whatsapp/templates`),
      ]);
      if (sRes.ok) setSettings(await sRes.json());
      if (tRes.ok) { const d = await tRes.json(); setTemplates(d.templates || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const save = async (key: string, value: string) => {
    setSaving(key);
    try {
      await fetch(`${API()}/api/workflow/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
      setSettings(s => ({ ...s, [key]: value }));
      showToast('success', 'Saved');
    } catch (e) { console.error(e); } finally { setSaving(null); }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const offDays: number[] = (() => { try { return JSON.parse(settings.NOT_ALLOWED_DAYS || '[0,6]'); } catch { return [0, 6]; } })();
  const toggleOffDay = (i: number) => {
    const next = offDays.includes(i) ? offDays.filter(d => d !== i) : [...offDays, i].sort();
    setSettings(s => ({ ...s, NOT_ALLOWED_DAYS: JSON.stringify(next) }));
  };

  const testConn = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(`${API()}/api/workflow/whatsapp/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: testPhone }) });
      setTestResult(await r.json());
    } catch (e) { setTestResult({ success: false, message: String(e) }); }
    finally { setTesting(false); }
  };

  const waEnabled = settings.WHATSAPP_ENABLED === 'true';

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--b24-bg)' }}>
      <span style={{ color: 'var(--b24-text-muted)', fontSize: 13 }}>Loading settings…</span>
    </div>
  );

  const TemplateField: React.FC<{ settingKey: string; placeholder: string }> = ({ settingKey, placeholder }) =>
    templates.length > 0
      ? <select className="b24-select" style={{ width: 220 }} value={settings[settingKey] || ''} onChange={e => setSettings(s => ({ ...s, [settingKey]: e.target.value }))}>
          <option value="">— Select template —</option>
          {templates.map(t => <option key={t.id} value={t.name}>{t.name} ({t.language})</option>)}
        </select>
      : <input type="text" className="b24-input" style={{ width: 220, fontFamily: 'monospace' }} placeholder={placeholder} value={settings[settingKey] || ''} onChange={e => setSettings(s => ({ ...s, [settingKey]: e.target.value }))} />;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--b24-bg)' }}>
      <div className="b24-navbar">
        <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--b24-text)' }}>Settings</h1>
      </div>

      {toast && (
        <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 100, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.type === 'success' ? 'var(--b24-green-dim)' : 'var(--b24-red-dim)', border: `1px solid ${toast.type === 'success' ? 'var(--b24-green-ring)' : 'var(--b24-red-ring)'}`, color: toast.type === 'success' ? 'var(--b24-green)' : 'var(--b24-red)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 820 }}>

        {/* Business Hours */}
        <Section
          icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          title="Business Hours" desc="Control when the round-robin engine processes new leads"
        >
          <FormRow label="Start Time" desc="Leads before this time queue until start." right={<><input type="time" value={settings.WORKFLOW_START_TIME || '09:00'} onChange={e => setSettings(s => ({ ...s, WORKFLOW_START_TIME: e.target.value }))} className="b24-input" style={{ width: 120 }} /><SaveBtn onClick={() => save('WORKFLOW_START_TIME', settings.WORKFLOW_START_TIME || '09:00')} saving={saving === 'WORKFLOW_START_TIME'} /></>} />
          <FormRow label="End Time" desc="Leads after this time queue for next morning." right={<><input type="time" value={settings.WORKFLOW_END_TIME || '18:00'} onChange={e => setSettings(s => ({ ...s, WORKFLOW_END_TIME: e.target.value }))} className="b24-input" style={{ width: 120 }} /><SaveBtn onClick={() => save('WORKFLOW_END_TIME', settings.WORKFLOW_END_TIME || '18:00')} saving={saving === 'WORKFLOW_END_TIME'} /></>} />
          <FormRow label="SLA Hours" desc="Hours before an unresolved lead triggers overdue notification." right={<><input type="number" min={1} max={168} value={settings.SLA_HOURS || '24'} onChange={e => setSettings(s => ({ ...s, SLA_HOURS: e.target.value }))} className="b24-input" style={{ width: 72, textAlign: 'center' }} /><SaveBtn onClick={() => save('SLA_HOURS', settings.SLA_HOURS || '24')} saving={saving === 'SLA_HOURS'} /></>} />
        </Section>

        {/* Off Days */}
        <Section
          icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          title="Off Days" desc="Leads arriving on these days queue until the next working day"
        >
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {DAYS.map((day, i) => (
                <button key={day} type="button" onClick={() => toggleOffDay(i)}
                  className={`b24-btn ${offDays.includes(i) ? 'b24-btn-primary' : 'b24-btn-secondary'}`}
                  style={{ height: 30, fontSize: 12, padding: '0 14px' }}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
            <button onClick={() => save('NOT_ALLOWED_DAYS', settings.NOT_ALLOWED_DAYS || '[0,6]')} disabled={saving === 'NOT_ALLOWED_DAYS'} className="b24-btn b24-btn-primary">
              {saving === 'NOT_ALLOWED_DAYS' ? 'Saving…' : 'Save Off Days'}
            </button>
          </div>
        </Section>

        {/* Assignment Rules */}
        <Section
          icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
          title="Assignment Rules" desc="Configure escalation thresholds and exclusion filters"
        >
          <FormRow label="Workflow Manager Bitrix ID" desc="Receives escalation tasks when a lead exceeds the max task limit." right={<><input type="text" className="b24-input" style={{ width: 80, textAlign: 'center', fontFamily: 'monospace' }} placeholder="1" value={settings.WORKFLOW_MANAGER_ID || '1'} onChange={e => setSettings(s => ({ ...s, WORKFLOW_MANAGER_ID: e.target.value }))} /><SaveBtn onClick={() => save('WORKFLOW_MANAGER_ID', settings.WORKFLOW_MANAGER_ID || '1')} saving={saving === 'WORKFLOW_MANAGER_ID'} /></>} />
          <FormRow label="Max Tasks Before Escalation" desc="Escalates to manager if a lead still has this many open tasks." right={<><input type="number" min={1} max={10} className="b24-input" style={{ width: 72, textAlign: 'center' }} value={settings.MAX_TASKS_BEFORE_ESCALATION || '2'} onChange={e => setSettings(s => ({ ...s, MAX_TASKS_BEFORE_ESCALATION: e.target.value }))} /><SaveBtn onClick={() => save('MAX_TASKS_BEFORE_ESCALATION', settings.MAX_TASKS_BEFORE_ESCALATION || '2')} saving={saving === 'MAX_TASKS_BEFORE_ESCALATION'} /></>} />
          <FormRow
            label="Excluded Source IDs"
            desc="Comma-separated Bitrix24 SOURCE_ID codes to skip entirely."
            right={<>
              <input type="text" className="b24-input" style={{ width: 180, fontFamily: 'monospace', fontSize: 12 }} placeholder="e.g. UC_NNO79X" value={settings.EXCLUDED_SOURCES_RAW ?? (() => { try { return JSON.parse(settings.EXCLUDED_SOURCES || '[]').join(','); } catch { return ''; } })()} onChange={e => setSettings(s => ({ ...s, EXCLUDED_SOURCES_RAW: e.target.value }))} />
              <SaveBtn onClick={() => { const arr = (settings.EXCLUDED_SOURCES_RAW || '').split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean); save('EXCLUDED_SOURCES', JSON.stringify(arr)); }} saving={saving === 'EXCLUDED_SOURCES'} />
            </>}
          />
        </Section>

        {/* WhatsApp */}
        <Section
          icon={<svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          title="WhatsApp Notifications" desc="Send agents WhatsApp alerts via OnCloud API"
        >
          {/* Toggle */}
          <div className="b24-form-row">
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--b24-text)', marginBottom: 3 }}>Enable WhatsApp Notifications</p>
              <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>Agents receive messages on assignments and SLA breaches.</p>
            </div>
            <button onClick={() => save('WHATSAPP_ENABLED', waEnabled ? 'false' : 'true')} className="b24-toggle" style={{ background: waEnabled ? 'var(--b24-green)' : '#3a3a3a' }}>
              <span className="b24-toggle-knob" style={{ left: waEnabled ? 23 : 3 }} />
            </button>
          </div>

          {/* API token info */}
          <div style={{ padding: '12px 0', borderBottom: '1px solid var(--b24-divider-light)' }}>
            <div style={{ background: 'var(--b24-primary-dim)', border: '1px solid var(--b24-primary-ring)', borderRadius: 8, padding: '12px 14px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-primary)', marginBottom: 4 }}>API Token Configuration</p>
              <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>
                Set <span className="b24-code">ONCLOUD_API_TOKEN</span> in your server <span className="b24-code">.env</span> file. Token from <strong style={{ color: 'var(--b24-text)' }}>apps.oncloudapi.com</strong>.
              </p>
            </div>
          </div>

          <FormRow label="Assignment Template" desc="Sent when a lead is assigned." right={<TemplateField settingKey="ONCLOUD_ASSIGN_TEMPLATE" placeholder="e.g. lead_assigned" />} />
          <FormRow label="Overdue / SLA Template" desc="Sent when SLA deadline passes." right={<TemplateField settingKey="ONCLOUD_OVERDUE_TEMPLATE" placeholder="e.g. lead_overdue" />} />
          <FormRow label="Template Language" desc="Language code." right={<input type="text" className="b24-input" style={{ width: 80, fontFamily: 'monospace' }} placeholder="en" value={settings.ONCLOUD_TEMPLATE_LANGUAGE || 'en'} onChange={e => setSettings(s => ({ ...s, ONCLOUD_TEMPLATE_LANGUAGE: e.target.value }))} />} />

          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--b24-divider-light)' }}>
            <button onClick={async () => {
              setSaving('WA_ALL');
              for (const k of ['ONCLOUD_ASSIGN_TEMPLATE', 'ONCLOUD_OVERDUE_TEMPLATE', 'ONCLOUD_TEMPLATE_LANGUAGE']) {
                if (settings[k] !== undefined) await fetch(`${API()}/api/workflow/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: settings[k] }) });
              }
              setSaving(null); showToast('success', 'Template settings saved');
            }} disabled={saving === 'WA_ALL'} className="b24-btn b24-btn-primary">
              {saving === 'WA_ALL' ? 'Saving…' : 'Save Template Settings'}
            </button>
          </div>

          {/* Test connection */}
          <div style={{ padding: '16px 0', borderBottom: '1px solid var(--b24-divider-light)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 4 }}>Test Connection</p>
            <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', marginBottom: 10 }}>Verify your OnCloud API token is working correctly.</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="text" className="b24-input" style={{ maxWidth: 200, fontFamily: 'monospace' }} placeholder="Phone (optional)" value={testPhone} onChange={e => setTestPhone(e.target.value)} />
              <button onClick={testConn} disabled={testing} className="b24-btn b24-btn-secondary" style={{ gap: 6 }}>
                {testing ? <svg className="b24-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                  : <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                {testing ? 'Testing…' : 'Test Connection'}
              </button>
            </div>
            {testResult && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 7, background: testResult.success ? 'var(--b24-green-dim)' : 'var(--b24-red-dim)', border: `1px solid ${testResult.success ? 'var(--b24-green-ring)' : 'var(--b24-red-ring)'}`, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <svg width="14" height="14" style={{ flexShrink: 0, marginTop: 1 }} fill={testResult.success ? 'var(--b24-green)' : 'var(--b24-red)'} viewBox="0 0 20 20">
                  {testResult.success ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /> : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />}
                </svg>
                <span style={{ fontSize: 13, color: testResult.success ? 'var(--b24-green)' : 'var(--b24-red)' }}>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Trigger reference */}
          <div style={{ padding: '16px 0' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 10 }}>Notification Triggers</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'New Lead Assigned', desc: 'Fires immediately when a lead is assigned.', params: '{{1}} Agent name  ·  {{2}} Lead name  ·  {{3}} Source' },
                { label: 'SLA Breach / Overdue', desc: 'Fires when SLA hours pass without resolution.', params: '{{1}} Agent name  ·  {{2}} Lead name  ·  {{3}} Source' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--b24-divider)' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--b24-green)', flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', marginBottom: 4 }}>{item.desc}</p>
                    <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--b24-primary)' }}>{item.params}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
};

export default Settings;
