import { apiRequest } from './api';
import { AuthApiResponse, LoginCredentials, RegisterData, User } from '../types';

export const authService = {
  /**
   * Password login (Admin/Owner)
   */
  async login(credentials: { email: string; password?: string }): Promise<AuthApiResponse> {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Google sign-in (Students/Admins)
   */
  async loginWithGoogle(idToken: string): Promise<AuthApiResponse> {
    return apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token: idToken }),
    });
  },

  /**
   * Register new student account
   */
  async register(data: RegisterData): Promise<AuthApiResponse> {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Fetch current session profile
   */
  async getMe(): Promise<{ success: boolean; user?: User; error?: string }> {
    return apiRequest('/auth/me');
  },

  /**
   * Logout user
   */
  async logout(): Promise<{ success: boolean }> {
    return apiRequest('/auth/logout', { method: 'POST' });
  },
};
