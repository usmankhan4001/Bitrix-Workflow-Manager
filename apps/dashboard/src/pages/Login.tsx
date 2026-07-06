const Login: React.FC = () => {
  const handleLogin = () => { window.location.href = 'http://localhost:3000/api/bitrix/install'; };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--b24-bg)', padding: 16 }}>
      <div style={{ maxWidth: 380, width: '100%', background: 'var(--b24-card)', border: '1px solid var(--b24-divider)', borderRadius: 16, padding: 36, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--b24-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" fill="none" stroke="#fff" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--b24-text)', lineHeight: 1.1 }}>Workflow Manager</div>
            <div style={{ fontSize: 12, color: 'var(--b24-text-muted)', marginTop: 2 }}>Bitrix24 App</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--b24-text-muted)', marginBottom: 28 }}>
          Sales Operations &amp; Lead Distribution Platform
        </p>
        <button onClick={handleLogin} className="b24-btn b24-btn-primary"
          style={{ width: '100%', height: 40, fontSize: 14, justifyContent: 'center', gap: 8 }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Login with Bitrix24
        </button>
        <p style={{ marginTop: 20, fontSize: 11, color: 'var(--b24-text-faint)', borderTop: '1px solid var(--b24-divider)', paddingTop: 16 }}>
          By logging in, you agree to the Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Login;
