import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

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
  <div className="b24-form-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--b24-divider-light)', gap: 16 }}>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: desc ? 3 : 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--b24-text)', margin: 0 }}>{label}</p>
        {tip && (
          <Tip text={tip}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--b24-text-faint)', color: 'var(--b24-text-faint)', fontSize: 9, fontWeight: 700, cursor: 'help' }}>?</span>
          </Tip>
        )}
      </div>
      {desc && <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', margin: 0 }}>{desc}</p>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{right}</div>
  </div>
);

const Notifications: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    apiFetch('/api/workflow/settings')
      .then(r => r.ok ? r.json() : {})
      .then(s => setSettings(s))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const save = async (key: string, value: string) => {
    try {
      await apiFetch('/api/workflow/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
      setSettings(s => ({ ...s, [key]: value }));
      showToast('success', 'Saved successfully');
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to save');
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const testConn = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await apiFetch('/api/workflow/whatsapp/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: testPhone }) });
      setTestResult(await r.json());
    } catch (e) {
      setTestResult({ success: false, message: String(e) });
    } finally {
      setTesting(false);
    }
  };

  const waEnabled = settings.WHATSAPP_ENABLED === 'true';

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--b24-bg)' }}>
      <span style={{ color: 'var(--b24-text-muted)', fontSize: 13 }}>Loading…</span>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="b24-navbar">
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--b24-text)' }}>Notifications</h1>
        <span className={`b24-badge b24-badge-${waEnabled ? 'success' : 'neutral'}`}>
          WhatsApp {waEnabled ? 'ON' : 'OFF'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {toast && (
          <div style={{ position: 'fixed', top: 18, right: 18, zIndex: 100, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: toast.type === 'success' ? 'var(--b24-green-dim)' : 'var(--b24-red-dim)', border: `1px solid ${toast.type === 'success' ? 'var(--b24-green-ring)' : 'var(--b24-red-ring)'}`, color: toast.type === 'success' ? 'var(--b24-green)' : 'var(--b24-red)' }}>
            {toast.msg}
          </div>
        )}

        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Info Card */}
          <div style={{ background: 'var(--b24-card)', border: '1px solid var(--b24-divider)', borderRadius: 10, padding: '16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <svg width="18" height="18" fill="none" stroke="var(--b24-green)" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 4, margin: 0 }}>WhatsApp Alerts via WAHA</p>
              <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', margin: 0 }}>
                When enabled, each salesperson gets a WhatsApp message the moment a lead is assigned to them — with the lead's name, contact number, and how long they have to follow up. Messages are sent through your self-hosted <strong style={{ color: 'var(--b24-text)' }}>WAHA</strong> service (configured via <code style={{ background: 'var(--b24-input-bg)', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>WAHA_URL</code> / <code style={{ background: 'var(--b24-input-bg)', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>WAHA_API_KEY</code>). No message templates to approve.
              </p>
            </div>
          </div>

          {/* Configuration Card */}
          <div style={{ width: '100%' }}>
            <div className="b24-section-top">
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
            <div className="b24-section-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', margin: '0 0 10px 0' }}>
                This is the message each agent receives when a lead is assigned to them (no templates to configure):
              </p>
              <div style={{ background: 'var(--b24-input-bg)', border: '1px solid var(--b24-divider)', borderRadius: 8, padding: '14px 16px', fontSize: 13, color: 'var(--b24-text)', whiteSpace: 'pre-line', lineHeight: 1.7, fontFamily: 'system-ui' }}>
                {'🟢 New lead assigned to you\n\n👤 Agent: Ahmad Ali Shah\n📋 Lead: Tania\n📞 Contact: 03001234567\n🌐 Source: Website\n⏰ Complete within: ' + (settings.SLA_HOURS || '24') + ' hours (by 16 Jun, 03:20 pm)\n\nPlease follow up and update the lead in Bitrix24.'}
              </div>
            </div>
          </div>

          {/* Test connection & reference */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            {/* Test Connection */}
            <div className="b24-card" style={{ padding: '20px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 4, margin: 0 }}>Test your connection</p>
              <p style={{ fontSize: 12, color: 'var(--b24-text-muted)', marginBottom: 12, margin: '4px 0 12px 0' }}>
                Send a test message to verify WAHA is connected (logged in) before enabling notifications for your team.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  className="b24-input"
                  style={{ maxWidth: 200, fontFamily: 'monospace' }}
                  placeholder="Phone number"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                />
                <button onClick={testConn} disabled={testing} className="b24-btn b24-btn-secondary" style={{ gap: 6 }}>
                  {testing
                    ? <><svg className="b24-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Testing…</>
                    : <>Send test message</>}
                </button>
              </div>
              {testResult && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 7, background: testResult.success ? 'var(--b24-green-dim)' : 'var(--b24-red-dim)', border: `1px solid ${testResult.success ? 'var(--b24-green-ring)' : 'var(--b24-red-ring)'}`, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <svg width="14" height="14" style={{ flexShrink: 0 }} fill={testResult.success ? 'var(--b24-green)' : 'var(--b24-red)'} viewBox="0 0 20 20">
                    {testResult.success
                      ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />}
                  </svg>
                  <span style={{ fontSize: 13, color: testResult.success ? 'var(--b24-green)' : 'var(--b24-red)' }}>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Triggers reference */}
            <div className="b24-card" style={{ padding: '20px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 12, margin: 0 }}>What triggers a WhatsApp message?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {[
                  {
                    label: 'Lead Assigned',
                    desc: 'Fires when a lead is assigned to someone — a rep (round-robin), the Escalation Manager (out-of-hours / duplicate / no agent), or a rep after the manager reassigns.',
                    params: 'Agent name  ·  Lead name  ·  Contact number  ·  Time to complete',
                    color: 'var(--b24-green)',
                  },
                ].map((item, idx) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--b24-divider)', borderBottom: idx === 1 ? '1px solid var(--b24-divider)' : undefined }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 4 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--b24-text)', marginBottom: 2, margin: 0 }}>{item.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--b24-text-muted)', marginBottom: 4, margin: '2px 0 4px 0' }}>{item.desc}</p>
                      <p style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--b24-primary)', margin: 0 }}>{item.params}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
