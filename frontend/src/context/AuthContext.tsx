import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, AuthContextType } from '../types';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists in storage when app loads
    const loadStoredAuth = async () => {
      try {
        const storedToken = await storage.getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
        const storedUser = await storage.getItem<User>(STORAGE_KEYS.AUTH_USER);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (error) {
        console.error('Failed to load stored auth:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    try {
      await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      await storage.setItem(STORAGE_KEYS.AUTH_USER, newUser);
      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error('Failed to save auth to storage:', error);
    }
  };

  const logout = async () => {
    try {
      await storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await storage.removeItem(STORAGE_KEYS.AUTH_USER);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Failed to delete auth from storage:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
