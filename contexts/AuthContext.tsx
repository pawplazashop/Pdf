
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type AuthState, type AuthContextType, type User, type ApiError } from '../types';

const AUTH_TOKEN_KEY = 'aamva_auth_token';
const API_BASE_URL = '/api'; // Placeholder for your API base URL
const DEFAULT_TIMEOUT = 10000; // 10 seconds

// Helper to wrap fetch with a timeout
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


// Helper to parse API response
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
    if (response.status === 204) { // No Content
        return undefined as T; // Or an appropriate representation for T if it can be void/undefined
    }
    if (!responseBodyText) {
        const error: ApiError = { message: `Received empty response body for a successful ${response.status} request.` };
        throw error;
    }
    const data = JSON.parse(responseBodyText); 
    return data;
  } catch (e) {
    const error: ApiError = { message: 'Received non-JSON or invalid JSON response from server for a successful request. Body: ' + responseBodyText, details: e instanceof Error ? e.message : String(e) };
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

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/user/me`, {
        headers: { 'Authorization': `Bearer ${currentToken}` },
      });
      const data = await handleApiResponse<{ user: User }>(response);
      setAuthState({ isAuthenticated: true, currentUser: data.user, loading: false, error: null });
    } catch (err) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      let message = 'Session expired or invalid.';
      if (err instanceof Error) message = err.message;
      else if (typeof (err as ApiError)?.message === 'string') message = (err as ApiError).message;
      setAuthState(prev => ({ ...prev, isAuthenticated: false, currentUser: null, error: message }));
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const signup = useCallback(async (email: string, username: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await handleApiResponse<{ token: string; user: User }>(response);
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setAuthState({ isAuthenticated: true, currentUser: data.user, loading: false, error: null });
    } catch (err) {
      let message = 'Signup failed.';
      if (err instanceof Error) message = err.message;
      else if (typeof (err as ApiError)?.message === 'string') message = (err as ApiError).message;
      setAuthState(prev => ({ 
        ...prev, 
        isAuthenticated: false, 
        currentUser: null, 
        error: message 
      }));
      throw err; 
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = useCallback(async (username: string, password?: string) => { 
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      if (!password) { 
          const err = { message: "Password is required for login." } as ApiError;
          setAuthState(prev => ({ ...prev, isAuthenticated: false, currentUser: null, error: err.message }));
          throw err;
      }
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await handleApiResponse<{ token: string; user: User }>(response);
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setAuthState({ isAuthenticated: true, currentUser: data.user, loading: false, error: null });
    } catch (err) {
      let message = 'Login failed.';
      if (err instanceof Error) message = err.message;
      else if (typeof (err as ApiError)?.message === 'string') message = (err as ApiError).message;
      setAuthState(prev => ({ 
        ...prev, 
        isAuthenticated: false, 
        currentUser: null, 
        error: message 
      }));
      throw err; 
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    setAuthState(prev => ({ ...prev, loading: true })); 
    try {
        if (token) {
            await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, { 
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            }, 5000); 
        }
    } catch (err) {
        let message = "Logout API call failed";
        if (err instanceof Error) message = err.message;
        else if (typeof (err as ApiError)?.message === 'string') message = (err as ApiError).message;
        console.warn(`${message} (this is expected if server is conceptual or unresponsive).`);
    } finally {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthState({ isAuthenticated: false, currentUser: null, loading: false, error: null });
    }
  }, []);

  const addCredits = useCallback(async (amount: number) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!authState.currentUser || !token) {
      const err = { message: "User not logged in to add credits." } as ApiError;
      setAuthState(prev => ({ ...prev, error: err.message, loading: false })); // Set loading false here as it's a precondition fail
      throw err;
    }
   
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/credits/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      const data = await handleApiResponse<{ success: boolean; newBalance: number; message?: string }>(response);
      if (data.success) {
        setAuthState(prev => ({
          ...prev,
          currentUser: prev.currentUser ? { ...prev.currentUser, creditBalance: data.newBalance } : null,
          loading: false, 
        }));
      } else {
        throw { message: data.message || "API reported failure to add credits." } as ApiError;
      }
    } catch (err) {
      let message = 'Failed to add credits.';
      if (err instanceof Error) message = err.message;
      else if (typeof (err as ApiError)?.message === 'string') message = (err as ApiError).message;
      setAuthState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, [authState.currentUser]);

  const deductCredits = useCallback(async (amount: number) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!authState.currentUser || !token) {
      const err = { message: "User not logged in to deduct credits." } as ApiError;
      setAuthState(prev => ({ ...prev, error: err.message, loading: false })); // Set loading false here
      throw err;
    }
    if (authState.currentUser.creditBalance < amount) {
      const err = { message: "Insufficient credits for deduction." } as ApiError;
      setAuthState(prev => ({ ...prev, error: err.message, loading: false })); // Set loading false here
      throw err;
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/credits/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      const data = await handleApiResponse<{ success: boolean; newBalance: number; message?: string }>(response);
      if (data.success) {
        setAuthState(prev => ({
          ...prev,
          currentUser: prev.currentUser ? { ...prev.currentUser, creditBalance: data.newBalance } : null,
          loading: false,
        }));
      } else {
        throw { message: data.message || "API reported failure to deduct credits." } as ApiError;
      }
    } catch (err) {
      let message = 'Failed to deduct credits.';
      if (err instanceof Error) message = err.message;
      else if (typeof (err as ApiError)?.message === 'string') message = (err as ApiError).message;
      setAuthState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, [authState.currentUser]);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // This loading screen is for initial token verification.
  if (authState.loading && !authState.currentUser && typeof window !== 'undefined' && localStorage.getItem(AUTH_TOKEN_KEY)) {
    // Check if this specific loading state (initial app load) is the one getting stuck.
    // fetchCurrentUser has its own finally block to set loading to false.
    // This condition should resolve once fetchCurrentUser completes.
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        Verifying session...
      </div>
    );
  }
  
  return (
    <AuthContext.Provider value={{ ...authState, signup, login, logout, addCredits, deductCredits, clearError, fetchCurrentUser }}>
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
