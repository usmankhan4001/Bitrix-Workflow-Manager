import React, { useState, useEffect } from 'react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API()}/api/workflow/assignment-log?limit=100`);
      if (res.ok) setLogs(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="flex-1 overflow-auto bg-b24-bg">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-b24-text">Assignment Log</h1>
          <p className="text-b24-text-muted text-sm mt-0.5">History of all round-robin lead assignments.</p>
        </div>
        <button onClick={fetchLogs} disabled={loading} className="btn-secondary flex items-center space-x-2">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div className="p-6">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3">Lead ID</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Team</th>
                <th className="px-5 py-3">Assigned At</th>
                <th className="px-5 py-3 text-center">WA Notified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-b24-border-light">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-b24-text-muted">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <p className="text-b24-text-muted">No assignments yet.</p>
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-b24-surface2 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-b24-blue">#{log.lead_id}</td>
                  <td className="px-5 py-3.5 text-b24-text font-medium">{log.agent_name}</td>
                  <td className="px-5 py-3.5 text-b24-text-muted">{log.team}</td>
                  <td className="px-5 py-3.5 text-b24-text-muted">{new Date(log.assigned_at).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-center">
                    {log.wa_notified ? (
                      <span className="badge-active">Sent</span>
                    ) : (
                      <span className="text-b24-text-light text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
