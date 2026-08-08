import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

interface AuthContextType {
  isPaired: boolean;
  loading: boolean;
  token: string | null;
  apiUrl: string | null;
  profile: any | null;
  pairDevice: (token: string, apiUrl: string) => Promise<void>;
  unpairDevice: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentToken: string, currentApiUrl: string) => {
    try {
      const response = await axios.get(`${currentApiUrl}/api/user/profile`, {
        headers: { Authorization: `Bearer ${currentToken}` },
        timeout: 10000
      });
      if (response.data && response.data.user) {
        setProfile(response.data.user);
        await SecureStore.setItemAsync('user_profile', JSON.stringify(response.data.user));
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
      // Fallback to cached profile if available
      try {
        const cached = await SecureStore.getItemAsync('user_profile');
        if (cached) setProfile(JSON.parse(cached));
      } catch (err) {}
    }
  };

  useEffect(() => {
    async function loadCredentials() {
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedApiUrl = await SecureStore.getItemAsync('api_url');
        if (storedToken && storedApiUrl) {
          setToken(storedToken);
          setApiUrl(storedApiUrl);
          // Try to load cached profile first for fast render
          const cachedProfile = await SecureStore.getItemAsync('user_profile');
          if (cachedProfile) setProfile(JSON.parse(cachedProfile));
          
          // Then fetch fresh profile in background
          fetchProfile(storedToken, storedApiUrl);
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
      await fetchProfile(newToken, newApiUrl);
    } catch (e) {
      console.error('Failed to save credentials to SecureStore', e);
    }
  };

  const unpairDevice = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('api_url');
      await SecureStore.deleteItemAsync('user_profile');
      setToken(null);
      setApiUrl(null);
      setProfile(null);
    } catch (e) {
      console.error('Failed to delete credentials from SecureStore', e);
    }
  };

  const isPaired = !!token && !!apiUrl;

  return (
    <AuthContext.Provider value={{ isPaired, loading, token, apiUrl, profile, pairDevice, unpairDevice }}>
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
