import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage for immediate availability
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('specialist_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('specialist_token'));
  const [loading, setLoading] = useState(true);

  // Set auth header on initial load if token exists
  useEffect(() => {
    const storedToken = localStorage.getItem('specialist_token');
    if (storedToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
  }, []);

  // Validate token and refresh user data on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('specialist_token');
      if (storedToken) {
        try {
          // Set the token in api headers
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          // Verify token by fetching current user
          const response = await api.get('/auth/me');
          // Update user data and persist to localStorage
          setUser(response.data);
          localStorage.setItem('specialist_user', JSON.stringify(response.data));
          setToken(storedToken);
        } catch (error) {
          // Token is invalid, clear everything
          console.error('Token validation failed:', error);
          localStorage.removeItem('specialist_token');
          localStorage.removeItem('specialist_user');
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token: newToken, ...userData } = response.data;

      // Store token and user data in localStorage
      localStorage.setItem('specialist_token', newToken);
      localStorage.setItem('specialist_user', JSON.stringify(userData));
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      setToken(newToken);
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors on logout
    }

    // Clear all auth data from localStorage
    localStorage.removeItem('specialist_token');
    localStorage.removeItem('specialist_user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
