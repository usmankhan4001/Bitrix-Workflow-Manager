// BX24.js bridge — works inside Bitrix24 iframe; falls back to localStorage for local dev.

declare global {
  interface Window {
    BX24?: {
      init: (callback: () => void) => void;
      getAuth: () => { access_token: string; domain: string; expires_in: number };
      isAdmin: () => boolean;
    };
  }
}

export interface BX24Auth {
  access_token: string;
  domain: string;
  isAdmin: boolean;
}

export function initBX24(): Promise<BX24Auth | null> {
  return new Promise((resolve) => {
    if (window.BX24) {
      window.BX24.init(() => {
        const auth = window.BX24!.getAuth();
        const isAdmin = window.BX24!.isAdmin();
        // Cache for API calls
        localStorage.setItem('bitrix_access_token', auth.access_token);
        localStorage.setItem('bitrix_domain', auth.domain);
        resolve({ access_token: auth.access_token, domain: auth.domain, isAdmin });
      });
    } else {
      // Local dev fallback — use whatever is stored in localStorage
      const access_token = localStorage.getItem('bitrix_access_token') || '';
      const domain = localStorage.getItem('bitrix_domain') || '';
      resolve(access_token && domain ? { access_token, domain, isAdmin: true } : null);
    }
  });
}

export function getStoredAuth(): { access_token: string; domain: string } {
  return {
    access_token: localStorage.getItem('bitrix_access_token') || '',
    domain: localStorage.getItem('bitrix_domain') || '',
  };
}
