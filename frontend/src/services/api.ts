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
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    console.error(`API Error in ${endpoint}:`, error);
    throw error;
  }
}
