import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, role, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">
            Loading System...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role?.toUpperCase())) {
    // Redirect to user's authorized dashboard
    if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
    if (role === 'PARENT') return <Navigate to="/parent/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
