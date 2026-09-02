import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const getLocalIp = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return 'localhost';
  return hostUri.split(':')[0];
};

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
const VERCEL_LIVE_URL = 'https://sameer-library-ten.vercel.app/api';

export const API_URL = ENV_API_URL || VERCEL_LIVE_URL;


/**
 * Basic fetch wrapper with support for JSON and auth headers
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch (error) {
    console.error('Failed to load auth token for request:', error);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type') || '';
    
    let data: any = null;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        data = { message: text };
      }
    }
    
    if (!response.ok) {
      throw new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
    }
    
    return data;
  } catch (error: any) {
    console.warn(`API Warning in ${endpoint}:`, error?.message || error);
    throw error;
  }
}
