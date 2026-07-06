import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Authenticating with Bitrix24...');

  useEffect(() => {
    // Read token data returned by the backend after successful OAuth exchange
    const accessToken = searchParams.get('access_token');
    const domain = searchParams.get('domain');

    if (accessToken && domain) {
      // Save credentials for frontend requests
      localStorage.setItem('bitrix_access_token', accessToken);
      localStorage.setItem('bitrix_domain', domain);

      setStatus(`Successfully authenticated via ${domain}. Redirecting...`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } else {
      setStatus('Authentication failed. Missing parameters.');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bitrix-darker px-4">
      <div className="card p-8 text-center max-w-sm w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-bitrix-blue mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white mb-2">Please wait</h2>
        <p className="text-bitrix-textMuted text-sm">{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
