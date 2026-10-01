import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user_data');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeChild, setActiveChild] = useState(() => {
    try {
      const saved = localStorage.getItem('active_child');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Fetch current user on mount to verify session
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.success && res.data) {
            setUser((prev) => ({ ...prev, ...res.data }));
            localStorage.setItem('user_data', JSON.stringify(res.data));

            // Setup active child if parent
            if (res.data.role === 'PARENT' && res.data.students?.length > 0) {
              setActiveChild((current) => {
                if (current && res.data.students.some((s) => s.id === current.id)) {
                  return current;
                }
                const first = res.data.students[0];
                localStorage.setItem('active_child', JSON.stringify(first));
                return first;
              });
            }
          }
        } catch {
          // Token expired or invalid
          setUser(null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_data');
          localStorage.removeItem('active_child');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (identifier, password, role) => {
    try {
      const res = await api.post('/auth/login', { identifier, password, role });
      if (res.success && res.data) {
        const { access_token, ...userData } = res.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        setUser(userData);

        // Fetch full profile info (e.g. for parent's children list)
        try {
          const meRes = await api.get('/auth/me');
          if (meRes.success && meRes.data) {
            const fullProfile = { ...userData, ...meRes.data };
            setUser(fullProfile);
            localStorage.setItem('user_data', JSON.stringify(fullProfile));

            if (fullProfile.role === 'PARENT' && fullProfile.students?.length > 0) {
              const firstChild = fullProfile.students[0];
              setActiveChild(firstChild);
              localStorage.setItem('active_child', JSON.stringify(firstChild));
            }
          }
        } catch {
          // fallback to userData
        }

        toast.success(`Welcome back, ${userData.name}!`);
        return { success: true, user: userData };
      }
      return { success: false, message: res.message };
    } catch (err) {
      toast.error(err.message || 'Login failed');
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('active_child');
      setUser(null);
      setActiveChild(null);
      toast.success('Logged out successfully');
    }
  };

  const switchActiveChild = (child) => {
    setActiveChild(child);
    localStorage.setItem('active_child', JSON.stringify(child));
    toast.success(`Switched child to ${child.name}`);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data) {
        setUser((prev) => ({ ...prev, ...res.data }));
        localStorage.setItem('user_data', JSON.stringify(res.data));
      }
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        activeChild,
        switchActiveChild,
        refreshProfile,
        mustChangePassword: user?.must_change_password || false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
