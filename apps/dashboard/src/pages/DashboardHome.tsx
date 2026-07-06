import React, { useState, useEffect } from 'react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

const StatCard: React.FC<{ title: string; value: React.ReactNode; sub: string; accent: string; icon: React.ReactNode }> = ({
  title, value, sub, accent, icon,
}) => (
  <div className="card p-5 flex items-start justify-between">
    <div>
      <p className="text-b24-text-muted text-sm font-medium">{title}</p>
      <div className={`mt-1 text-3xl font-bold ${accent}`}>{value}</div>
      <p className="text-b24-text-muted text-xs mt-1">{sub}</p>
    </div>
    <div className={`p-2.5 rounded-lg ${accent === 'text-b24-blue' ? 'bg-b24-blue-light' : accent === 'text-b24-green' ? 'bg-b24-green-light' : 'bg-yellow-50'}`}>
      {icon}
    </div>
  </div>
);

const DashboardHome: React.FC = () => {
  const [lateLeads, setLateLeads] = useState<any[]>([]);
  const [assignedToday, setAssignedToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const apiUrl = API();
      const [leadsRes, todayRes] = await Promise.all([
        fetch(`${apiUrl}/api/workflow/late-leads`),
        fetch(`${apiUrl}/api/workflow/assigned-today`),
      ]);
      if (leadsRes.ok) setLateLeads(await leadsRes.json());
      if (todayRes.ok) setAssignedToday(await todayRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const forceAssign = async (leadId: string) => {
    setAssigning(leadId);
    try {
      const apiUrl = API();
      const token = localStorage.getItem('bitrix_access_token');
      const domain = localStorage.getItem('bitrix_domain');
      await fetch(`${apiUrl}/api/workflow/assign-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, team: 'Sales Executives', access_token: token, domain }),
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-b24-bg">
      {/* Page Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-b24-text">Live Queue Monitor</h1>
          <p className="text-b24-text-muted text-sm mt-0.5">Real-time overview of leads awaiting round-robin assignment.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-secondary flex items-center space-x-2"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Pending in Queue"
            value={lateLeads.length}
            sub="Leads waiting for assignment"
            accent="text-b24-orange"
            icon={<svg className="w-5 h-5 text-b24-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            title="Workflow Status"
            value="Active"
            sub="Round-robin distribution running"
            accent="text-b24-blue"
            icon={<svg className="w-5 h-5 text-b24-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            title="Assigned Today"
            value={assignedToday}
            sub="Resets every midnight"
            accent="text-b24-green"
            icon={<svg className="w-5 h-5 text-b24-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
        </div>

        {/* Late Leads Table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-b24-border flex items-center justify-between">
            <h2 className="font-semibold text-b24-text">Queued Late Leads</h2>
            {lateLeads.length > 0 && (
              <span className="bg-b24-orange/10 text-b24-orange text-xs font-semibold px-2 py-1 rounded-full">
                {lateLeads.length} waiting
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-5 py-3">Lead ID</th>
                  <th className="px-5 py-3">Arrival Time</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-b24-border-light">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-b24-text-muted">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="animate-spin w-4 h-4 text-b24-blue" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        <span>Loading queue...</span>
                      </div>
                    </td>
                  </tr>
                ) : lateLeads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-b24-green-light flex items-center justify-center">
                          <svg className="w-6 h-6 text-b24-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="font-semibold text-b24-text">Queue is clear!</p>
                        <p className="text-b24-text-muted text-xs">All leads have been processed.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  lateLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-b24-surface2 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-b24-blue">#{lead.lead_id}</td>
                      <td className="px-5 py-3.5 text-b24-text-muted">{new Date(lead.created_at).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className="badge-pending">Waiting</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => forceAssign(lead.lead_id)}
                          disabled={assigning === lead.lead_id}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          {assigning === lead.lead_id ? 'Assigning...' : 'Force Assign'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
