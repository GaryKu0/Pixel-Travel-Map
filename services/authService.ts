// @ts-ignore
const PasskeySDK = (window as any).PasskeySDK;

const PASSKEY_API_URL = import.meta.env.VITE_PASSKEY_API_URL || '';
const API_URL = import.meta.env.VITE_API_URL || '';

class AuthService {
  private sdk: PasskeySDK;
  private currentUser: any = null;
  private currentMapId: number | null = null;

  constructor() {
    this.sdk = new PasskeySDK(PASSKEY_API_URL);
  }

  async register(username: string, email: string, displayName?: string) {
    try {
      const response = await this.sdk.register(username, displayName || username, email);
      if (response.token) {
        await this.syncUserData();
      }
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(username?: string) {
    try {
      const response = await this.sdk.login(username);
      if (response.token) {
        await this.syncUserData();
      }
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.sdk.logout();
      this.currentUser = null;
      this.currentMapId = null;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async syncUserData() {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await fetch(`${API_URL}/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to sync user data');
      }

      const data = await response.json();
      this.currentUser = data.user;
      this.currentMapId = data.defaultMapId;
      return data;
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  }

  async getProfile() {
    try {
      return await this.sdk.getProfile();
    } catch (error) {
      console.error('Get profile error:', error);
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('passkey_auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getCurrentMapId() {
    return this.currentMapId;
  }

  setCurrentMapId(mapId: number) {
    this.currentMapId = mapId;
  }
}

export const authService = new AuthService();
export default authService;