import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  isPaired: boolean;
  loading: boolean;
  token: string | null;
  apiUrl: string | null;
  pairDevice: (token: string, apiUrl: string) => Promise<void>;
  unpairDevice: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCredentials() {
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedApiUrl = await SecureStore.getItemAsync('api_url');
        if (storedToken && storedApiUrl) {
          setToken(storedToken);
          setApiUrl(storedApiUrl);
        }
      } catch (e) {
        console.error('Failed to load credentials from SecureStore', e);
      } finally {
        setLoading(false);
      }
    }
    loadCredentials();
  }, []);

  const pairDevice = async (newToken: string, newApiUrl: string) => {
    try {
      await SecureStore.setItemAsync('auth_token', newToken);
      await SecureStore.setItemAsync('api_url', newApiUrl);
      setToken(newToken);
      setApiUrl(newApiUrl);
    } catch (e) {
      console.error('Failed to save credentials to SecureStore', e);
    }
  };

  const unpairDevice = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('api_url');
      setToken(null);
      setApiUrl(null);
    } catch (e) {
      console.error('Failed to delete credentials from SecureStore', e);
    }
  };

  const isPaired = !!token && !!apiUrl;

  return (
    <AuthContext.Provider value={{ isPaired, loading, token, apiUrl, pairDevice, unpairDevice }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
