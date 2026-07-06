const Login: React.FC = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:3000/api/bitrix/install';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#edeef0', padding: 16 }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', padding: 40, textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#2066b0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" fill="none" stroke="#ffffff" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#333333', lineHeight: 1 }}>Workflow Manager</div>
            <div style={{ fontSize: 12, color: '#8b96a8', marginTop: 2 }}>Bitrix24 App</div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#8b96a8', marginBottom: 28 }}>Sales Operations &amp; Lead Distribution Platform</p>

        <button
          onClick={handleLogin}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '10px 24px', gap: 8, display: 'flex', alignItems: 'center' }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Login with Bitrix24
        </button>

        <p style={{ marginTop: 24, fontSize: 11, color: '#b0b8c2', borderTop: '1px solid #edeef0', paddingTop: 16 }}>
          By logging in, you agree to the Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Login;
