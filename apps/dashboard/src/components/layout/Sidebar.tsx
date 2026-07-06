import { NavLink } from 'react-router-dom';

const NAV = [
  {
    to: '/dashboard',
    end: true,
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/dashboard/team',
    label: 'Team',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const EXT_LINKS = [
  {
    href: 'https://apidocs.bitrix24.com/',
    label: 'Bitrix24 REST API',
    icon: (
      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    href: 'https://github.com/usmankhan4001/Bitrix-Workflow-Manager',
    label: 'GitHub',
    icon: (
      <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
];

const Sidebar: React.FC = () => {
  return (
    <div style={{
      width: 'var(--b24-sidebar-w)',
      background: 'var(--b24-sidebar)',
      borderRight: '1px solid var(--b24-divider)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      flexShrink: 0,
    }}>

      {/* Header — matches template's "≡ Dashboard" row */}
      <div style={{
        height: 'var(--b24-header-h)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        borderBottom: '1px solid var(--b24-divider)',
        flexShrink: 0,
      }}>
        {/* Hamburger icon */}
        <svg width="18" height="18" fill="none" stroke="var(--b24-text-muted)" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--b24-text)' }}>Dashboard</span>
      </div>

      {/* Search — matches B24DashboardSearchButton */}
      <div style={{ padding: '10px 10px 6px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 10px',
          height: 32,
          borderRadius: 6,
          border: '1px solid var(--b24-divider)',
          background: 'var(--b24-input-bg)',
          cursor: 'default',
        }}>
          <svg width="13" height="13" fill="none" stroke="var(--b24-text-faint)" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--b24-text-faint)' }}>Search…</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {['CTRL', 'K'].map(k => (
              <span key={k} style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--b24-text-faint)',
                background: '#2e2e2e',
                border: '1px solid var(--b24-divider)',
                borderRadius: 3,
                padding: '1px 4px',
                lineHeight: 1.4,
              }}>{k}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={!!item.end}
            className="b24-nav-link"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 8,
              marginBottom: 2,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--b24-text)' : 'var(--b24-text-muted)',
              background: isActive ? 'var(--b24-nav-active)' : 'transparent',
              transition: 'background 0.1s',
            })}
          >
            {({ isActive }) => (
              <>
                {/* Icon — circle bg on active like template */}
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isActive ? 'var(--b24-nav-icon)' : 'transparent',
                  color: isActive ? 'var(--b24-primary)' : 'var(--b24-text-muted)',
                }}>
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* External links */}
      <div style={{ padding: '6px 8px', borderTop: '1px solid var(--b24-divider)' }}>
        {EXT_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 10px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 12,
              color: 'var(--b24-text-muted)',
              transition: 'background 0.1s',
            }}
            className="b24-nav-link"
          >
            <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {link.icon}
            </div>
            <span>{link.label}</span>
            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginLeft: 'auto', opacity: 0.4 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ))}
      </div>

      {/* User — matches UserMenu.vue at bottom */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--b24-divider)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: '#1587fa',
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
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--b24-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Usman Khan</div>
          <div style={{ fontSize: 11, color: 'var(--b24-text-muted)' }}>Super Admin</div>
        </div>
        <svg width="14" height="14" fill="none" stroke="var(--b24-text-faint)" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </div>
    </div>
  );
};

export default Sidebar;
