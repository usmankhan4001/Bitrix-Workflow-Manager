import React, { useState, useEffect } from 'react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SettingRow: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
}> = ({ label, hint, children, onSave, saving }) => (
  <div className="flex items-start justify-between py-4 border-b border-b24-border-light last:border-0">
    <div className="flex-1 min-w-0 pr-6">
      <p className="text-sm font-medium text-b24-text">{label}</p>
      {hint && <p className="text-xs text-b24-text-muted mt-0.5">{hint}</p>}
    </div>
    <div className="flex items-center space-x-3 flex-shrink-0">
      {children}
      <button
        onClick={onSave}
        disabled={saving}
        className="btn-primary text-xs px-3 py-1.5"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>
);

const WorkflowSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API()}/api/workflow/settings`);
      if (res.ok) setSettings(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const save = async (key: string, value: string) => {
    setSaving(key);
    try {
      await fetch(`${API()}/api/workflow/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setSettings((s) => ({ ...s, [key]: value }));
      showToast('Setting saved');
    } catch (e) { console.error(e); }
    finally { setSaving(null); }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const offDays: number[] = (() => {
    try { return JSON.parse(settings.NOT_ALLOWED_DAYS || '[0,6]'); } catch { return [0, 6]; }
  })();

  const toggleOffDay = (idx: number) => {
    const current = offDays.includes(idx) ? offDays.filter((d) => d !== idx) : [...offDays, idx].sort();
    setSettings((s) => ({ ...s, NOT_ALLOWED_DAYS: JSON.stringify(current) }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-b24-bg">
        <div className="text-b24-text-muted">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-b24-bg">
      {/* Header */}
      <div className="page-header">
        <h1 className="text-xl font-semibold text-b24-text">Workflow Settings</h1>
        <p className="text-b24-text-muted text-sm mt-0.5">Configure global rules for your lead distribution engine.</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-b24-green text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-in fade-in">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toast}</span>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Hours */}
        <div className="card">
          <div className="px-5 py-4 border-b border-b24-border">
            <h2 className="font-semibold text-b24-text flex items-center space-x-2">
              <svg className="w-4 h-4 text-b24-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Business Hours</span>
            </h2>
          </div>
          <div className="px-5">
            <SettingRow
              label="Start Time"
              hint="Leads arriving before this time are queued until start."
              onSave={() => save('WORKFLOW_START_TIME', settings.WORKFLOW_START_TIME || '09:00')}
              saving={saving === 'WORKFLOW_START_TIME'}
            >
              <input
                type="time"
                value={settings.WORKFLOW_START_TIME || '09:00'}
                onChange={(e) => setSettings((s) => ({ ...s, WORKFLOW_START_TIME: e.target.value }))}
                className="input-field w-36"
              />
            </SettingRow>
            <SettingRow
              label="End Time"
              hint="Leads arriving after this time are queued for next morning."
              onSave={() => save('WORKFLOW_END_TIME', settings.WORKFLOW_END_TIME || '18:00')}
              saving={saving === 'WORKFLOW_END_TIME'}
            >
              <input
                type="time"
                value={settings.WORKFLOW_END_TIME || '18:00'}
                onChange={(e) => setSettings((s) => ({ ...s, WORKFLOW_END_TIME: e.target.value }))}
                className="input-field w-36"
              />
            </SettingRow>
            <SettingRow
              label="SLA Hours"
              hint="Hours before an unresolved lead triggers an overdue notification."
              onSave={() => save('SLA_HOURS', settings.SLA_HOURS || '24')}
              saving={saving === 'SLA_HOURS'}
            >
              <input
                type="number"
                min={1}
                max={168}
                value={settings.SLA_HOURS || '24'}
                onChange={(e) => setSettings((s) => ({ ...s, SLA_HOURS: e.target.value }))}
                className="input-field w-24 text-center"
              />
            </SettingRow>
          </div>
        </div>

        {/* Off Days */}
        {/* Assignment Rules */}
        <div className="card">
          <div className="px-5 py-4 border-b border-b24-border">
            <h2 className="font-semibold text-b24-text flex items-center space-x-2">
              <svg className="w-4 h-4 text-b24-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Assignment Rules</span>
            </h2>
          </div>
          <div className="px-5">
            <SettingRow
              label="Workflow Manager Bitrix ID"
              hint="This user receives escalation tasks when a lead exceeds the max task limit."
              onSave={() => save('WORKFLOW_MANAGER_ID', settings.WORKFLOW_MANAGER_ID || '1')}
              saving={saving === 'WORKFLOW_MANAGER_ID'}
            >
              <input
                type="text"
                className="input-field w-28 font-mono text-center"
                placeholder="e.g. 1"
                value={settings.WORKFLOW_MANAGER_ID || '1'}
                onChange={(e) => setSettings((s) => ({ ...s, WORKFLOW_MANAGER_ID: e.target.value }))}
              />
            </SettingRow>
            <SettingRow
              label="Max Tasks Before Escalation"
              hint="If a lead already has this many tasks and is still overdue, it escalates to the manager."
              onSave={() => save('MAX_TASKS_BEFORE_ESCALATION', settings.MAX_TASKS_BEFORE_ESCALATION || '2')}
              saving={saving === 'MAX_TASKS_BEFORE_ESCALATION'}
            >
              <input
                type="number"
                min={1}
                max={10}
                className="input-field w-24 text-center"
                value={settings.MAX_TASKS_BEFORE_ESCALATION || '2'}
                onChange={(e) => setSettings((s) => ({ ...s, MAX_TASKS_BEFORE_ESCALATION: e.target.value }))}
              />
            </SettingRow>
            <SettingRow
              label="Excluded Source IDs"
              hint="Comma-separated Bitrix24 SOURCE_ID codes to skip. e.g. UC_NNO79X,ADVERTISING"
              onSave={() => {
                // Convert comma list to JSON array
                const raw = settings.EXCLUDED_SOURCES_RAW || '';
                const arr = raw.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
                save('EXCLUDED_SOURCES', JSON.stringify(arr));
              }}
              saving={saving === 'EXCLUDED_SOURCES'}
            >
              <input
                type="text"
                className="input-field w-48 font-mono text-xs"
                placeholder="e.g. UC_NNO79X"
                value={settings.EXCLUDED_SOURCES_RAW ?? (() => {
                  try { return JSON.parse(settings.EXCLUDED_SOURCES || '[]').join(','); } catch { return ''; }
                })()}
                onChange={(e) => setSettings((s) => ({ ...s, EXCLUDED_SOURCES_RAW: e.target.value }))}
              />
            </SettingRow>
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-b24-border">
            <h2 className="font-semibold text-b24-text flex items-center space-x-2">
              <svg className="w-4 h-4 text-b24-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Off Days</span>
            </h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-b24-text-muted mb-3">
              Leads arriving on selected days will be queued until the next working day.
            </p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleOffDay(idx)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors border ${
                    offDays.includes(idx)
                      ? 'bg-b24-red/10 text-b24-red border-b24-red/30'
                      : 'bg-white text-b24-text border-b24-border hover:border-b24-blue'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={() => save('NOT_ALLOWED_DAYS', settings.NOT_ALLOWED_DAYS || '[0,6]')}
                disabled={saving === 'NOT_ALLOWED_DAYS'}
                className="btn-primary text-xs"
              >
                {saving === 'NOT_ALLOWED_DAYS' ? 'Saving...' : 'Save Off Days'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowSettings;
