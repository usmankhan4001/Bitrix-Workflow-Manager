// bitrix24Auth.js

import fsextra from 'fs-extra';
import path from 'path';
import { B24OAuth } from '@bitrix24/b24jssdk';

// --- Configuration ---

// Path where the OAuth tokens are stored
const TOKEN_FILE = path.join('/mnt/Bitrix24Workflow/data', 'b24_tokens.json');
const PORT = process.env.PORT || 3000;

// Singleton instance for B24OAuth client
let _b24Instance = null;

// App credentials loaded from environment variables
const oauthSecret = {
    clientId: process.env.BITRIX_CLIENT_ID,
    clientSecret: process.env.BITRIX_CLIENT_SECRET,
};

// --- Redirect URI Helper ---

/**
 * Generates the correct redirect URI for the OAuth flow.
 * It's set to a dedicated path to separate the OAuth flow from the main application root.
 * @returns {string} The full redirect URI.
 */
export function getRedirectUri() {
    // This MUST match the URI registered in the Bitrix24 app settings.
    // The server must listen on this path (e.g., /auth/callback)
    return process.env.BITRIX_REDIRECT_URI || `http://localhost:${PORT}/auth/callback`;
}

// --- Token Management ---

/**
 * Loads existing tokens from the file system.
 * @returns {Promise<object|null>} The tokens object or null if the file doesn't exist.
 */
async function loadTokens() {
    if (await fsextra.pathExists(TOKEN_FILE)) {
        return fsextra.readJson(TOKEN_FILE);
    }
    return null;
}

/**
 * Saves the given tokens to the file system.
 * @param {object} tokens The OAuth tokens object to save.
 */
async function saveTokens(tokens) {
    await fsextra.writeJson(TOKEN_FILE, tokens, { spaces: 2 });
}

// --- OAuth Flow Functions ---

/**
 * Generates the Bitrix24 authorization URL for the initial setup.
 * @returns {string} The full authorization URL.
 */
export function getAuthorizationUrl() {
    const redirectUri = getRedirectUri();
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    // Note: The domain 'pcicrm.bitrix24.com' is hardcoded here.
    return `https://pcicrm.bitrix24.com/oauth/authorize/?client_id=${oauthSecret.clientId}&response_type=code&redirect_uri=${encodedRedirectUri}`;
}

/**
 * Exchanges the authorization 'code' received from the OAuth redirect for tokens.
 * Saves the tokens and is typically followed by a service restart.
 * @param {string} code The authorization code.
 */
export async function handleOAuthRedirect(code) {
    const redirectUri = getRedirectUri(); 
    const correctDomain = "pcicrm.bitrix24.com";
    
    // URL to exchange the 'code' for 'tokens'
    const url = `https://oauth.bitrix.info/oauth/token/?grant_type=authorization_code&client_id=${oauthSecret.clientId}&client_secret=${oauthSecret.clientSecret}&redirect_uri=${redirectUri}&code=${code}`;

    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();

    if (!data.access_token) {
        console.error('Bitrix Token Exchange Error:', data);
        throw new Error('Failed to get access token. Check the authorization code and client credentials.');
    }

    // Map and validate the received data into the format expected by B24OAuth
    const correctedData = {
        // Map snake_case to camelCase as required by the SDK
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        clientEndpoint: data.client_endpoint,
        serverEndpoint: data.server_endpoint,
        memberId: data.member_id,
        userId: data.user_id,
        
        // Use the intended domain, overriding any default or missing value
        domain: correctDomain || data.domain, 

        // Add the applicationToken field, which is required by the SDK for initialization
        applicationToken: data.application_token || 'PLACEHOLDER_FOR_SDK_INIT', 
        
        // Include other necessary fields
        expires: data.expires,
        scope: data.scope,
        status: data.status,
    };
    
    await saveTokens(correctedData);
}

// --- SDK Initialization ---

/**
 * Initializes the B24OAuth instance. Loads tokens if they exist, otherwise returns null.
 * @returns {Promise<B24OAuth|null>} The initialized B24OAuth instance or null if tokens are missing.
 */
export async function initB24() {
    if (_b24Instance) return _b24Instance;

    let oauthParams = await loadTokens();

    // If no tokens, return null. The calling server code handles the authorization process.
    if (!oauthParams) {
        return null; 
    }

    // Create B24OAuth instance using the loaded tokens and application secrets
    const oauth = new B24OAuth(oauthParams, oauthSecret);

    // Register a callback to auto-save tokens whenever they are refreshed
    oauth.setCallbackRefreshAuth(async ({ b24OAuthParams }) => {
        await saveTokens(b24OAuthParams);
        console.log('Tokens refreshed and saved!');
    });

    _b24Instance = oauth;
    return _b24Instance;
}

// --- SDK Export Wrapper ---

/**
 * A convenient wrapper to initialize and access the B24 SDK instance.
 */
export const b24 = {
    /**
     * Attempts to initialize the B24 instance.
     * @returns {Promise<B24OAuth|null>} The initialized instance or null.
     */
    async init() {
        _b24Instance = await initB24();
        return _b24Instance;
    },
    /**
     * Gets the initialized B24 instance. Throws an error if not yet initialized.
     */
    get instance() {
        if (!_b24Instance) throw new Error('B24 instance not initialized. Call b24.init() first.');
        return _b24Instance;
    },
};