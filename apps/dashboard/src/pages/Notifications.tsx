import React, { useState, useEffect } from 'react';

const API = () => import.meta.env.VITE_API_URL ?? '';

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
          padding: '6px 10px', fontSize: 12, color: 'var(--b24-text)', whiteSpace: 'nowrap',
          zIndex: 50, pointerEvents: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {text}
        </span>
      )}
    </span>
  );
};

const FormRow: React.FC<{ label: string; desc?: string; tip?: string; right: React.ReactNode }> = ({ label, desc, tip, right }) => (
  <div className="b24-form-row">
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: desc ? 3 : 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--b24-text)' }}>{label}</p>
        {tip && (
          <Tip text={tip}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--b24-text-faint)', color: 'var(--b24-text-faint)', fontSize: 9, fontWeight: 700, cursor: 'help' }}>?</span>
          </Tip>
        )}
      </div>
      {desc && <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>{desc}</p>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{right}</div>
  </div>
);

const Notifications: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API()}/api/workflow/settings`).then(r => r.ok ? r.json() : {}),
      fetch(`${API()}/api/workflow/whatsapp/templates`).then(r => r.ok ? r.json() : { templates: [] }),
    ]).then(([s, t]) => {
      setSettings(s);
      setTemplates(t.templates || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const save = async (key: string, value: string) => {
    setSaving(key);
    try {
      await fetch(`${API()}/api/workflow/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
      setSettings(s => ({ ...s, [key]: value }));
      showToast('success', 'Saved');
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
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

  const TemplateField: React.FC<{ settingKey: string; placeholder: string }> = ({ settingKey, placeholder }) =>
    templates.length > 0
      ? <select className="b24-select" style={{ width: 220 }} value={settings[settingKey] || ''} onChange={e => setSettings(s => ({ ...s, [settingKey]: e.target.value }))}>
          <option value="">— Select template —</option>
          {templates.map(t => <option key={t.id} value={t.name}>{t.name} ({t.language})</option>)}
        </select>
      : <input type="text" className="b24-input" style={{ width: 220, fontFamily: 'monospace' }} placeholder={placeholder} value={settings[settingKey] || ''} onChange={e => setSettings(s => ({ ...s, [settingKey]: e.target.value }))} />;

  const SaveBtn: React.FC<{ k: string; val: string }> = ({ k, val }) => (
    <button onClick={() => save(k, val)} disabled={saving === k} className="b24-btn b24-btn-secondary" style={{ height: 28, fontSize: 12, padding: '0 12px' }}>
      {saving === k ? 'Saving…' : 'Save'}
    </button>
  );

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--b24-bg)' }}>
      <span style={{ color: 'var(--b24-text-muted)', fontSize: 13 }}>Loading…</span>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}><div style={{ flex: 1, overflowY: 'auto' }}>
      <div className="b24-navbar">
        <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--b24-text)' }}>Notifications</h1>
        <span className={`b24-badge b24-badge-${waEnabled ? 'success' : 'neutral'}`}>
          WhatsApp {waEnabled ? 'ON' : 'OFF'}
        </span>
      </div>

      {toast && (
        <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 100, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.type === 'success' ? 'var(--b24-green-dim)' : 'var(--b24-red-dim)', border: `1px solid ${toast.type === 'success' ? 'var(--b24-green-ring)' : 'var(--b24-red-ring)'}`, color: toast.type === 'success' ? 'var(--b24-green)' : 'var(--b24-red)' }}>
          {toast.msg}
        </div>
      )}

      <div className="b24-two-col" style={{ alignItems: 'start' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* What is this? */}
        <div style={{ background: 'var(--b24-card)', border: '1px solid var(--b24-divider)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <svg width="18" height="18" fill="none" stroke="var(--b24-green)" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 4 }}>WhatsApp Alerts via OnCloud API</p>
            <p style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>
              When enabled, your team members receive an automatic WhatsApp message whenever a lead is assigned to them, and another if they miss the SLA deadline. You need an active account at <strong style={{ color: 'var(--b24-text)' }}>apps.oncloudapi.com</strong> and your token set in the server's <code style={{ background: 'var(--b24-input-bg)', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>ONCLOUD_API_TOKEN</code> environment variable.
            </p>
          </div>
        </div>

        {/* Master toggle */}
        <div className="b24-section-top" style={{ borderRadius: 'var(--b24-radius) var(--b24-radius) 0 0' }}>
          <FormRow
            label="Enable WhatsApp notifications"
            desc="Turn on to send automatic alerts. Turn off to stop all WhatsApp messages."
            right={
              <button
                onClick={() => save('WHATSAPP_ENABLED', waEnabled ? 'false' : 'true')}
                className="b24-toggle"
                style={{ background: waEnabled ? 'var(--b24-green)' : '#3a3a3a' }}
              >
                <span className="b24-toggle-knob" style={{ left: waEnabled ? 23 : 3 }} />
              </button>
            }
          />
        </div>
        <div className="b24-section-body" style={{ padding: '0 22px', marginTop: -20 }}>

          {/* Templates */}
          <FormRow
            label="New lead assigned — message template"
            desc="Sent immediately when a salesperson is assigned a lead."
            tip="This must match the exact template name in your OnCloud account. The template should have: {{1}} = agent name, {{2}} = lead name, {{3}} = source."
            right={<><TemplateField settingKey="ONCLOUD_ASSIGN_TEMPLATE" placeholder="e.g. lead_assigned" /><SaveBtn k="ONCLOUD_ASSIGN_TEMPLATE" val={settings.ONCLOUD_ASSIGN_TEMPLATE || ''} /></>}
          />
          <FormRow
            label="SLA overdue — message template"
            desc="Sent when a lead hasn't been handled within your SLA window."
            tip="Same format as the assignment template. {{1}} = agent name, {{2}} = lead name, {{3}} = source."
            right={<><TemplateField settingKey="ONCLOUD_OVERDUE_TEMPLATE" placeholder="e.g. lead_overdue" /><SaveBtn k="ONCLOUD_OVERDUE_TEMPLATE" val={settings.ONCLOUD_OVERDUE_TEMPLATE || ''} /></>}
          />
          <FormRow
            label="Template language"
            desc="Must match the language code in your OnCloud template."
            tip='Usually "en" for English or "ar" for Arabic. Must match exactly what is set in OnCloud.'
            right={<><input type="text" className="b24-input" style={{ width: 80, fontFamily: 'monospace' }} placeholder="en" value={settings.ONCLOUD_TEMPLATE_LANGUAGE || 'en'} onChange={e => setSettings(s => ({ ...s, ONCLOUD_TEMPLATE_LANGUAGE: e.target.value }))} /><SaveBtn k="ONCLOUD_TEMPLATE_LANGUAGE" val={settings.ONCLOUD_TEMPLATE_LANGUAGE || 'en'} /></>}
          />

          {/* Save all */}
          <div style={{ padding: '14px 0', borderTop: '1px solid var(--b24-divider-light)' }}>
            <button
              onClick={async () => {
                setSaving('WA_ALL');
                for (const k of ['ONCLOUD_ASSIGN_TEMPLATE', 'ONCLOUD_OVERDUE_TEMPLATE', 'ONCLOUD_TEMPLATE_LANGUAGE']) {
                  if (settings[k] !== undefined) {
                    await fetch(`${API()}/api/workflow/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: settings[k] }) });
                  }
                }
                setSaving(null); showToast('success', 'Template settings saved');
              }}
              disabled={saving === 'WA_ALL'}
              className="b24-btn b24-btn-primary"
            >
              {saving === 'WA_ALL' ? 'Saving…' : 'Save all template settings'}
            </button>
          </div>

          {/* Test connection */}
          <div style={{ padding: '16px 0', borderTop: '1px solid var(--b24-divider-light)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 4 }}>Test your connection</p>
            <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', marginBottom: 10 }}>
              Send a test message to verify your OnCloud API token is working before enabling notifications for your team.
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                className="b24-input"
                style={{ maxWidth: 200, fontFamily: 'monospace' }}
                placeholder="Phone (optional)"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
              />
              <button onClick={testConn} disabled={testing} className="b24-btn b24-btn-secondary" style={{ gap: 6 }}>
                {testing
                  ? <><svg className="b24-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Testing…</>
                  : <>Test connection</>}
              </button>
            </div>
            {testResult && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 7, background: testResult.success ? 'var(--b24-green-dim)' : 'var(--b24-red-dim)', border: `1px solid ${testResult.success ? 'var(--b24-green-ring)' : 'var(--b24-red-ring)'}`, display: 'flex', gap: 8, alignItems: 'center' }}>
                <svg width="14" height="14" style={{ flexShrink: 0 }} fill={testResult.success ? 'var(--b24-green)' : 'var(--b24-red)'} viewBox="0 0 20 20">
                  {testResult.success
                    ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />}
                </svg>
                <span style={{ fontSize: 13, color: testResult.success ? 'var(--b24-green)' : 'var(--b24-red)' }}>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Trigger reference */}
          <div style={{ padding: '16px 0' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 10 }}>What triggers a WhatsApp message?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                {
                  label: 'New Lead Assigned',
                  desc: 'Fires immediately when a lead is round-robin assigned to a salesperson.',
                  params: '{{1}} Agent name  ·  {{2}} Lead name  ·  {{3}} Source',
                  color: 'var(--b24-green)',
                },
                {
                  label: 'SLA Overdue',
                  desc: 'Fires when the SLA deadline passes and the lead is still unresolved — reminds the agent.',
                  params: '{{1}} Agent name  ·  {{2}} Lead name  ·  {{3}} Source',
                  color: 'var(--b24-orange)',
                },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--b24-divider)' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', marginBottom: 4 }}>{item.desc}</p>
                    <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--b24-primary)' }}>{item.params}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>{/* end left col */}

        {/* RIGHT — test + triggers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 0 }}>
          <div className="b24-card" style={{ padding: '16px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 4 }}>Test Connection</p>
            <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', marginBottom: 12 }}>Verify your OnCloud API token is working before enabling for your team.</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="text" className="b24-input" style={{ fontFamily: 'monospace', fontSize: 12 }} placeholder="Phone number (optional)" />
            </div>
            <button className="b24-btn b24-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>Send test message</button>
          </div>
          <div className="b24-card" style={{ padding: '16px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 12 }}>What triggers a WhatsApp message?</p>
            {[
              { label: 'New Lead Assigned', desc: 'Fires immediately when a lead is assigned.', color: 'var(--b24-green)' },
              { label: 'SLA Overdue', desc: 'Fires when the deadline passes and lead is still open.', color: 'var(--b24-orange)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--b24-divider-light)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 4 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 2 }}>{item.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--b24-text-muted)' }}>{item.desc}</p>
                  <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--b24-primary)', marginTop: 3 }}>name · lead · source</p>
                </div>
              </div>
            ))}
          </div>
        </div>{/* end right col */}

      </div>{/* end two-col */}
      </div>{/* end scroll */}
    </div>
  );
};

export default Notifications;
