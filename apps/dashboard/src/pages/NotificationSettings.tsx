import React, { useState, useEffect } from 'react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, tplRes] = await Promise.all([
        fetch(`${API()}/api/workflow/settings`),
        fetch(`${API()}/api/workflow/whatsapp/templates`),
      ]);
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (tplRes.ok) {
        const d = await tplRes.json();
        setTemplates(d.templates || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const saveKey = async (key: string, value: string) => {
    setSaving(true);
    try {
      await fetch(`${API()}/api/workflow/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setSettings((s) => ({ ...s, [key]: value }));
      showToast('success', 'Setting saved');
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API()}/api/workflow/whatsapp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, message: String(e) });
    } finally { setTesting(false); }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-b24-bg">
        <div className="text-b24-text-muted">Loading notification settings...</div>
      </div>
    );
  }

  const waEnabled = settings.WHATSAPP_ENABLED === 'true';

  return (
    <div className="flex-1 overflow-auto bg-b24-bg">
      {/* Header */}
      <div className="page-header">
        <h1 className="text-xl font-semibold text-b24-text">WhatsApp Alerts</h1>
        <p className="text-b24-text-muted text-sm mt-0.5">
          Configure OnCloud API to send WhatsApp notifications to agents.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 ${toast.type === 'success' ? 'bg-b24-green' : 'bg-b24-red'}`}>
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Enable Toggle */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-b24-text">Enable WhatsApp Notifications</h2>
              <p className="text-sm text-b24-text-muted mt-1">
                When enabled, agents receive WhatsApp messages on new lead assignments and SLA breaches.
              </p>
            </div>
            <button
              onClick={() => saveKey('WHATSAPP_ENABLED', waEnabled ? 'false' : 'true')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${waEnabled ? 'bg-b24-green' : 'bg-b24-border'}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${waEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* OnCloud API Config */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-b24-border">
            <h2 className="font-semibold text-b24-text flex items-center space-x-2">
              <svg className="w-4 h-4 text-b24-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              <span>OnCloud API Configuration</span>
            </h2>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Token is stored in .env on server; we show info */}
              <div className="md:col-span-2 bg-b24-blue-light border border-b24-blue/20 rounded-lg p-4 text-sm text-b24-blue">
                <p className="font-medium">API Token Configuration</p>
                <p className="mt-1 text-b24-text-muted text-xs">
                  Set <code className="bg-white px-1 rounded font-mono">ONCLOUD_API_TOKEN</code> in your server's <code className="bg-white px-1 rounded font-mono">.env</code> file.
                  This token is never exposed to the frontend. Get your token from{' '}
                  <span className="font-medium">apps.oncloudapi.com</span>.
                </p>
              </div>

              {/* Assignment Template */}
              <div>
                <label className="block text-xs font-semibold text-b24-text-muted uppercase tracking-wide mb-1.5">
                  Assignment Template Name
                </label>
                {templates.length > 0 ? (
                  <select
                    className="select-field"
                    value={settings.ONCLOUD_ASSIGN_TEMPLATE || ''}
                    onChange={(e) => setSettings((s) => ({ ...s, ONCLOUD_ASSIGN_TEMPLATE: e.target.value }))}
                  >
                    <option value="">— Select template —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input-field font-mono"
                    placeholder="e.g. lead_assigned"
                    value={settings.ONCLOUD_ASSIGN_TEMPLATE || ''}
                    onChange={(e) => setSettings((s) => ({ ...s, ONCLOUD_ASSIGN_TEMPLATE: e.target.value }))}
                  />
                )}
                <p className="text-xs text-b24-text-light mt-1">Sent when a lead is assigned to an agent.</p>
              </div>

              {/* Overdue Template */}
              <div>
                <label className="block text-xs font-semibold text-b24-text-muted uppercase tracking-wide mb-1.5">
                  Overdue / SLA Breach Template
                </label>
                {templates.length > 0 ? (
                  <select
                    className="select-field"
                    value={settings.ONCLOUD_OVERDUE_TEMPLATE || ''}
                    onChange={(e) => setSettings((s) => ({ ...s, ONCLOUD_OVERDUE_TEMPLATE: e.target.value }))}
                  >
                    <option value="">— Select template —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input-field font-mono"
                    placeholder="e.g. lead_overdue"
                    value={settings.ONCLOUD_OVERDUE_TEMPLATE || ''}
                    onChange={(e) => setSettings((s) => ({ ...s, ONCLOUD_OVERDUE_TEMPLATE: e.target.value }))}
                  />
                )}
                <p className="text-xs text-b24-text-light mt-1">Sent when an SLA deadline passes without resolution.</p>
              </div>

              {/* Template Language */}
              <div>
                <label className="block text-xs font-semibold text-b24-text-muted uppercase tracking-wide mb-1.5">
                  Template Language Code
                </label>
                <input
                  type="text"
                  className="input-field font-mono"
                  placeholder="en"
                  value={settings.ONCLOUD_TEMPLATE_LANGUAGE || 'en'}
                  onChange={(e) => setSettings((s) => ({ ...s, ONCLOUD_TEMPLATE_LANGUAGE: e.target.value }))}
                />
              </div>
            </div>

            <button
              onClick={async () => {
                setSaving(true);
                for (const key of ['ONCLOUD_ASSIGN_TEMPLATE', 'ONCLOUD_OVERDUE_TEMPLATE', 'ONCLOUD_TEMPLATE_LANGUAGE']) {
                  if (settings[key] !== undefined) {
                    await fetch(`${API()}/api/workflow/settings`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key, value: settings[key] }),
                    });
                  }
                }
                setSaving(false);
                showToast('success', 'Template settings saved');
              }}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Template Settings'}
            </button>
          </div>
        </div>

        {/* Connection Test */}
        <div className="card p-5">
          <h2 className="font-semibold text-b24-text mb-1">Test Connection</h2>
          <p className="text-sm text-b24-text-muted mb-4">Verify your OnCloud API token is working.</p>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              className="input-field max-w-xs font-mono"
              placeholder="Phone number (optional)"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <button
              onClick={testConnection}
              disabled={testing}
              className="btn-secondary flex items-center space-x-2"
            >
              {testing ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
          {testResult && (
            <div className={`mt-3 flex items-start space-x-2 text-sm p-3 rounded-lg ${testResult.success ? 'bg-b24-green-light text-green-800' : 'bg-red-50 text-red-700'}`}>
              <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${testResult.success ? 'text-b24-green' : 'text-b24-red'}`} fill="currentColor" viewBox="0 0 20 20">
                {testResult.success
                  ? <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  : <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />}
              </svg>
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Notification Triggers Info */}
        <div className="card p-5">
          <h2 className="font-semibold text-b24-text mb-3">Notification Triggers</h2>
          <div className="space-y-3">
            {[
              { trigger: 'New Lead Assigned', desc: 'Fires immediately when a lead is assigned to an agent.', template: 'ONCLOUD_ASSIGN_TEMPLATE', params: '{{1}} = Agent first name   {{2}} = Lead name   {{3}} = Source (e.g. Website, Referral)' },
              { trigger: 'SLA Breach / Overdue', desc: 'Fires when a lead has not been resolved within the configured SLA hours.', template: 'ONCLOUD_OVERDUE_TEMPLATE', params: '{{1}} = Agent first name   {{2}} = Lead name   {{3}} = Source' },
            ].map((item) => (
              <div key={item.trigger} className="flex items-start space-x-3 p-3 bg-b24-surface2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-b24-green mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-b24-text">{item.trigger}</p>
                  <p className="text-xs text-b24-text-muted mt-0.5">{item.desc}</p>
                  <p className="text-xs font-mono text-b24-blue mt-1">{item.params}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
