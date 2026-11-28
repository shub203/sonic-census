import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, USE_REAL_BACKEND } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('noise_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('noise_auth_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (USE_REAL_BACKEND && token === 'demo-token') {
      const demoPresetEmails = ['officer@soniccensus.ai', 'analyst@soniccensus.ai', 'citizen@soniccensus.ai'];
      if (user?.email && demoPresetEmails.includes(user.email)) {
        switchRole(user.role || 'citizen');
      } else {
        logout();
      }
      return;
    }
    if (token && token !== 'demo-token') {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          localStorage.setItem('noise_user', JSON.stringify(res.data));
        })
        .catch((err) => {
          if (err?.response?.status === 401) {
            logout();
          }
        });
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, user: userData } = res.data;
      localStorage.setItem('noise_auth_token', access_token);
      localStorage.setItem('noise_user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Authentication failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role = 'citizen') => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password, role });
      const { access_token, user: userData } = res.data;
      localStorage.setItem('noise_auth_token', access_token);
      localStorage.setItem('noise_user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('noise_auth_token');
    localStorage.removeItem('noise_user');
    setToken(null);
    setUser(null);
  };

  const switchRole = async (targetRole) => {
    const rolesMap = {
      officer: {
        id: 'officer-01',
        name: 'CPCB Environmental Officer',
        email: 'officer@soniccensus.ai',
        password: 'admin123',
        role: 'officer'
      },
      admin: {
        id: 'officer-01',
        name: 'CPCB Environmental Officer',
        email: 'officer@soniccensus.ai',
        password: 'admin123',
        role: 'officer'
      },
      analyst: {
        id: 'analyst-02',
        name: 'Acoustic Data Analyst',
        email: 'analyst@soniccensus.ai',
        password: 'analyst123',
        role: 'analyst'
      },
      citizen: {
        id: 'citizen-01',
        name: 'Public Citizen Observer',
        email: 'citizen@soniccensus.ai',
        password: 'citizen123',
        role: 'citizen'
      },
      observer: {
        id: 'citizen-01',
        name: 'Public Citizen Observer',
        email: 'citizen@soniccensus.ai',
        password: 'citizen123',
        role: 'citizen'
      },
      user: {
        id: 'citizen-01',
        name: 'Public Citizen Observer',
        email: 'citizen@soniccensus.ai',
        password: 'citizen123',
        role: 'citizen'
      }
    };
    const chosen = rolesMap[targetRole] || rolesMap.citizen;

    try {
      const res = await api.post('/auth/login', {
        email: chosen.email,
        password: chosen.password
      });
      const { access_token, user: userData } = res.data;
      if (access_token && userData) {
        localStorage.setItem('noise_auth_token', access_token);
        localStorage.setItem('noise_user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);
        return;
      }
    } catch {
      // Fallback to demo state when backend is unavailable
    }

    const fallbackUser = {
      id: chosen.id,
      name: chosen.name,
      email: chosen.email,
      role: chosen.role
    };
    setUser(fallbackUser);
    setToken('demo-token');
    localStorage.setItem('noise_user', JSON.stringify(fallbackUser));
    localStorage.setItem('noise_auth_token', 'demo-token');
  };

  const isAdmin = user?.role === 'officer' || user?.role === 'admin' || user?.role === 'analyst';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, switchRole, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
