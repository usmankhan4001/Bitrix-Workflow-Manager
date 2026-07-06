

const Login: React.FC = () => {
  const handleLogin = () => {
    // We will redirect to our backend API which then redirects to Bitrix OAuth
    window.location.href = 'http://localhost:3000/api/bitrix/install';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bitrix-darker px-4">
      <div className="max-w-md w-full card p-8 text-center shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">
          Bitrix<span className="text-bitrix-blue">Flow</span>
        </h1>
        <p className="text-bitrix-textMuted mb-8 text-sm">Sales Operations & Lead Distribution Platform</p>
        
        <button 
          onClick={handleLogin}
          className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
          <span className="font-semibold text-lg">Login with Bitrix24</span>
        </button>
        
        <div className="mt-8 text-xs text-bitrix-textMuted text-left border-t border-bitrix-border pt-4">
          <p>By logging in, you agree to the Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
