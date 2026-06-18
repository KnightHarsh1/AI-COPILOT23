import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser();
      setUser(response.data);
      return response.data;
    } catch (error) {
      localStorage.removeItem('access_token');
      setIsAuthenticated(false);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;

      if (payload.exp < currentTime) {
        localStorage.removeItem('access_token');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      // Token is valid but the user object doesn't survive a refresh —
      // fetch it so Settings, theme, and personalization work immediately.
      fetchCurrentUser().finally(() => setIsLoading(false));
    } catch (error) {
      localStorage.removeItem('access_token');
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    localStorage.setItem('access_token', response.data.access_token);
    setUser(response.data.user);
    setIsAuthenticated(true);
    return response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    localStorage.setItem('access_token', response.data.access_token);
    setUser(response.data.user);
    setIsAuthenticated(true);
    return response;
  };

  const forgotPassword = async (email) => {
    return authService.forgotPassword({ email });
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Merge a partial user update (e.g. after Settings save) without a round trip.
  const updateUser = (partialUser) => {
    setUser((prev) => (prev ? { ...prev, ...partialUser } : partialUser));
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      forgotPassword,
      logout,
      updateUser,
      refreshUser: fetchCurrentUser,
    }),
    [user, isAuthenticated, isLoading, fetchCurrentUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
