/**
 * Passkey SDK
 * 
 * A modern, promise-based library for WebAuthn passkey authentication.
 * Simplifies registration and login flows, with built-in error handling and browser support detection.
 * 
 * @version 2.1.0
 * @author Gemini
 */

class PasskeySDK {
    /**
     * @param {string} baseUrl - The base URL of your API.
     * @param {string} tokenStorageKey - The key to use for storing the auth token in localStorage.
     */
    constructor(baseUrl = '', tokenStorageKey = 'passkey_auth_token') {
        this.baseUrl = baseUrl;
        this.tokenStorageKey = tokenStorageKey;

        if (typeof window !== 'undefined' && !this.isSupported()) {
            console.warn('Passkeys are not supported in this browser.');
        }
    }

    /**
     * Checks if the browser supports WebAuthn.
     * @returns {boolean}
     */
    isSupported() {
        return typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;
    }

    _getToken() {
        return localStorage.getItem(this.tokenStorageKey);
    }

    _setToken(token) {
        localStorage.setItem(this.tokenStorageKey, token);
    }

    _removeToken() {
        localStorage.removeItem(this.tokenStorageKey);
    }

    async _fetch(endpoint, options = {}) {
        const token = this._getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'An unknown error occurred.');
        }

        return data;
    }

    async _handleAuthResponse(response) {
        if (response.token) {
            this._setToken(response.token);
        }
        return response;
    }

    /**
     * Registers a new user with a passkey.
     * @param {string} username - The desired username.
     * @param {string} [displayName] - An optional display name.
     * @param {string} [email] - An optional email address.
     * @returns {Promise<any>}
     */
    async register(username, displayName, email) {
        if (!this.isSupported()) {
            throw new Error('Passkeys are not supported in this browser.');
        }

        const regOptions = await this._fetch('/api/auth/register-begin', {
            method: 'POST',
            body: JSON.stringify({ username, displayName, email }),
        });

        const { startRegistration } = SimpleWebAuthnBrowser;
        const credential = await startRegistration(regOptions);

        const response = await this._fetch('/api/auth/register-complete', {
            method: 'POST',
            body: JSON.stringify({
                ...regOptions,
                credential,
                username,
                displayName,
                email,
            }),
        });

        return this._handleAuthResponse(response);
    }

    /**
     * Logs in a user with a passkey.
     * @param {string} [username] - Optional username to assist the login process.
     * @returns {Promise<any>}
     */
    async login(username) {
        if (!this.isSupported()) {
            throw new Error('Passkeys are not supported in this browser.');
        }

        const loginOptions = await this._fetch('/api/auth/login-begin', {
            method: 'POST',
            body: JSON.stringify({ username }),
        });

        const { startAuthentication } = SimpleWebAuthnBrowser;
        const credential = await startAuthentication(loginOptions);

        const response = await this._fetch('/api/auth/login-complete', {
            method: 'POST',
            body: JSON.stringify({
                expectedChallenge: loginOptions.challenge,
                credential,
            }),
        });

        return this._handleAuthResponse(response);
    }

    /**
     * Logs the user out.
     * @returns {Promise<void>}
     */
    async logout() {
        await this._fetch('/api/auth/logout', { method: 'POST' });
        this._removeToken();
    }

    /**
     * Gets the current user's profile information.
     * @returns {Promise<any>}
     */
    async getProfile() {
        return this._fetch('/api/auth/me');
    }

    /**
     * Gets the full user profile, including extra data.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<any>}
     */
    async getFullProfile(userId) {
        return this._fetch(`/api/user/${userId}/full`);
    }

    /**
     * Updates a user's profile data.
     * @param {string} userId - The ID of the user.
     * @param {object} profileData - The data to update.
     * @returns {Promise<any>}
     */
    async updateProfile(userId, profileData) {
        return this._fetch(`/api/user/${userId}/complete`, {
            method: 'POST',
            body: JSON.stringify(profileData),
        });
    }

    /**
     * Gets the user's extra data.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<any>}
     */
    async getExtraData(userId) {
        return this._fetch(`/api/user/${userId}/extra`);
    }

    /**
     * Updates the user's extra data.
     * @param {string} userId - The ID of the user.
     * @param {object} extraData - The extra data to update.
     * @returns {Promise<any>}
     */
    async updateExtraData(userId, extraData) {
        return this._fetch(`/api/user/${userId}/extra`, {
            method: 'POST',
            body: JSON.stringify(extraData),
        });
    }

    /**
     * Deletes the user's extra data.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<any>}
     */
    async deleteExtraData(userId) {
        return this._fetch(`/api/user/${userId}/extra`, {
            method: 'DELETE',
        });
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PasskeySDK;
} else if (typeof define === 'function' && define.amd) {
    define([], () => PasskeySDK);
} else if (typeof window !== 'undefined') {
    window.PasskeySDK = PasskeySDK;
}