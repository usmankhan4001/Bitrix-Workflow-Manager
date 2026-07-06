import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    end: true,
    label: 'Dashboard',
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/dashboard/team',
    label: 'Team',
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const Sidebar: React.FC = () => {
  return (
    <div style={{
      width: 'var(--b24-sidebar-w)',
      background: 'var(--b24-sidebar-bg)',
      borderRight: '1px solid var(--b24-border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      flexShrink: 0,
    }}>
      {/* App title — matches AppTitle.vue style */}
      <div style={{
        height: 56,
        borderBottom: '1px solid var(--b24-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: 'var(--b24-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="17" height="17" fill="none" stroke="#fff" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--b24-text)', lineHeight: 1.2 }}>
            Workflow
          </div>
          <div style={{ fontSize: 11, color: 'var(--b24-text-muted)', lineHeight: 1.2 }}>
            Bitrix24 App
          </div>
        </div>
      </div>

      {/* Search hint — like B24DashboardSearchButton */}
      <div style={{ padding: '10px 12px 6px', flexShrink: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid var(--b24-border)',
          background: 'var(--b24-card-alt)',
          opacity: 0.7,
          cursor: 'default',
        }}>
          <svg width="13" height="13" fill="none" stroke="var(--b24-text-muted)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span style={{ fontSize: 12, color: 'var(--b24-text-muted)' }}>Search…</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={!!item.end}
            className="b24-nav-item"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 10px',
              borderRadius: 7,
              marginBottom: 2,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--b24-primary)' : 'var(--b24-text-muted)',
              background: isActive ? 'var(--b24-primary-bg)' : 'transparent',
              textDecoration: 'none',
              transition: 'background 0.1s, color 0.1s',
            })}
          >
            <span style={{ flexShrink: 0, opacity: 0.85 }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--b24-border)', margin: '0 12px' }} />

      {/* User — matches UserMenu.vue */}
      <div style={{
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--b24-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
        }}>
          U
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Usman Khan
          </div>
          <div style={{ fontSize: 11, color: 'var(--b24-text-muted)' }}>Super Admin</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
