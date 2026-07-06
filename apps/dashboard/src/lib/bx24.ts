// BX24.js bridge — works inside Bitrix24 iframe; falls back to localStorage for local dev.

declare global {
  interface Window {
    BX24?: {
      init: (callback: () => void) => void;
      getAuth: () => { access_token: string; domain: string; expires_in: number };
      isAdmin: () => boolean;
      installFinish?: () => void;
    };
  }
}

export interface BX24Auth {
  access_token: string;
  domain: string;
  isAdmin: boolean;
}

// BX24.js is loaded async, so it may not be on `window` yet when the app boots.
// Poll briefly for it before deciding we're outside Bitrix.
function waitForBX24(timeoutMs = 4000, stepMs = 100): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.BX24) return resolve(true);
    let waited = 0;
    const timer = setInterval(() => {
      if (window.BX24) { clearInterval(timer); resolve(true); }
      else if ((waited += stepMs) >= timeoutMs) { clearInterval(timer); resolve(false); }
    }, stepMs);
  });
}

export async function initBX24(): Promise<BX24Auth | null> {
  await waitForBX24();
  return new Promise((resolve) => {
    if (window.BX24) {
      window.BX24.init(() => {
        const auth = window.BX24!.getAuth();
        const isAdmin = window.BX24!.isAdmin();
        // Cache for API calls
        localStorage.setItem('bitrix_access_token', auth.access_token);
        localStorage.setItem('bitrix_domain', auth.domain);

        // Complete the Bitrix24 local-app installation. Bitrix marks the app as
        // "not completely installed" until installFinish() is called. We call it
        // once (guarded so it doesn't re-fire on every normal open).
        if (!localStorage.getItem('bx24_install_done')) {
          try { window.BX24!.installFinish?.(); } catch { /* not in install mode */ }
          localStorage.setItem('bx24_install_done', '1');
        }

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
