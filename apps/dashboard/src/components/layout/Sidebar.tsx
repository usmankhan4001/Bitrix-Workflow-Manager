import { NavLink } from 'react-router-dom';

const NAV = [
  {
    section: 'Monitor',
    items: [
      {
        to: '/dashboard',
        end: true,
        label: 'Live Queue',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        to: '/dashboard/activity',
        label: 'Assignment Log',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Configuration',
    items: [
      {
        to: '/dashboard/team',
        label: 'Team Management',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
      {
        to: '/dashboard/settings',
        label: 'Workflow Settings',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        to: '/dashboard/notifications',
        label: 'WhatsApp Alerts',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
      },
    ],
  },
];

const Sidebar: React.FC = () => {
  return (
    <div className="w-60 bg-b24-sidebar flex flex-col h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-b24-blue flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">WorkflowManager</div>
            <div className="text-b24-sidebar-text-muted text-xs">Bitrix24 App</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.section} className="mb-4">
            <div className="px-4 mb-1 text-b24-sidebar-text-muted text-xs font-semibold uppercase tracking-wider">
              {group.section}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  `flex items-center space-x-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-b24-sidebar-active text-white'
                      : 'text-b24-sidebar-text hover:text-white hover:bg-b24-sidebar-hover'
                  }`
                }
              >
                <span className={`flex-shrink-0`}>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-b24-blue flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            U
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white font-medium truncate">Usman Khan</div>
            <div className="text-xs text-b24-sidebar-text-muted">Super Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
