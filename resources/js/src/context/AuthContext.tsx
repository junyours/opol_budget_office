import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/api';
import API from '../services/api';

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  token: string | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
      // No token — not logged in, nothing to restore
      setLoading(false);
      return;
    }

    // Token exists — always fetch fresh user data from the DB.
    // This ensures avatar, name, and any profile changes are up-to-date
    // after a refresh instead of relying on a stale localStorage copy.
    setToken(storedToken);

    API.get('/profile')
      .then(({ data }) => {
        // BaseApiController wraps the payload in { data: ... }
        setUser(data.data ?? data);
      })
      .catch(() => {
        // Token is expired or invalid — force logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    // Only the token needs to be persisted — user is always re-fetched from
    // the DB on mount, so we no longer need a localStorage copy of the user.
    localStorage.setItem('token', authToken);
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user'); // clean up any legacy stored user
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;