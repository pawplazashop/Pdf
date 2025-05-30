import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type AuthState, type AuthContextType, type User, type ApiError } from '../types';

const AUTH_TOKEN_KEY = 'aamva_auth_token';
const API_BASE_URL = 'http://localhost:3000/api';
const DEFAULT_TIMEOUT = 10000;

async function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}, timeout: number = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000} seconds`);
    }
    throw error;
  }
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  const responseBodyText = await response.text();

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorDetails;
    try {
      const errorData = JSON.parse(responseBodyText);
      errorMessage = errorData.message || errorMessage;
      errorDetails = errorData.details;
    } catch (e) {
      // JSON parsing failed
    }
    const error: ApiError = { message: errorMessage, details: errorDetails };
    throw error;
  }

  try {
    if (response.status === 204) {
      return undefined as T;
    }
    if (!responseBodyText) {
      const error: ApiError = { message: `Received empty response body for a successful ${response.status} request.` };
      throw error;
    }
    const data = JSON.parse(responseBodyText);
    return data;
  } catch (e) {
    const error: ApiError = { message: 'Invalid JSON response from server', details: e instanceof Error ? e.message : String(e) };
    throw error;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    currentUser: null,
    loading: true,
    error: null,
  });

  const fetchCurrentUser = useCallback(async (token?: string) => {
    const currentToken = token || localStorage.getItem(AUTH_TOKEN_KEY);
    if (!currentToken) {
      setAuthState({ isAuthenticated: false, currentUser: null, loading: false, error: null });
      return;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/user/me`, {
        headers: { 'Authorization': `Bearer ${currentToken}` },
      });
      const data = await handleApiResponse<{ user: User }>(response);
      setAuthState({ isAuthenticated: true, currentUser: data.user, loading: false, error: null });
    } catch (err) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      const message = err instanceof Error ? err.message : 'Session expired or invalid';
      setAuthState({ isAuthenticated: false, currentUser: null, loading: false, error: message });
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const signup = useCallback(async (email: string, username: string, password: string, captchaToken: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, captchaToken }),
      });
      const data = await handleApiResponse<{ token: string; user: User }>(response);
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setAuthState({ isAuthenticated: true, currentUser: data.user, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setAuthState(prev => ({ ...prev, isAuthenticated: false, currentUser: null, error: message, loading: false }));
      throw err;
    }
  }, []);

  const login = useCallback(async (username: string, password: string, captchaToken: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captchaToken }),
      });
      const data = await handleApiResponse<{ token: string; user: User }>(response);
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setAuthState({ isAuthenticated: true, currentUser: data.user, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setAuthState(prev => ({ ...prev, isAuthenticated: false, currentUser: null, error: message, loading: false }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthState({ isAuthenticated: false, currentUser: null, loading: false, error: null });
  }, []);

  const addCredits = useCallback(async (amount: number) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/credits/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount }),
      });
      const data = await handleApiResponse<{ success: boolean; newBalance: number }>(response);
      setAuthState(prev => ({
        ...prev,
        currentUser: prev.currentUser ? { ...prev.currentUser, creditBalance: data.newBalance } : null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add credits';
      setAuthState(prev => ({ ...prev, error: message }));
      throw err;
    }
  }, []);

  const deductCredits = useCallback(async (amount: number) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/credits/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount }),
      });
      const data = await handleApiResponse<{ success: boolean; newBalance: number }>(response);
      setAuthState(prev => ({
        ...prev,
        currentUser: prev.currentUser ? { ...prev.currentUser, creditBalance: data.newBalance } : null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deduct credits';
      setAuthState(prev => ({ ...prev, error: message }));
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{
      ...authState,
      signup,
      login,
      logout,
      addCredits,
      deductCredits,
      clearError,
      fetchCurrentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};