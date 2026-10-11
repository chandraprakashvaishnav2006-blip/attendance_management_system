import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();

  const handleGoHome = () => {
    if (!isAuthenticated) navigate('/login');
    else if (role === 'ADMIN') navigate('/admin/dashboard');
    else if (role === 'STUDENT') navigate('/student/dashboard');
    else if (role === 'PARENT') navigate('/parent/dashboard');
    else navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-center">
      <div className="space-y-4 max-w-sm">
        <h1 className="text-6xl font-extralight tracking-tight text-slate-400 dark:text-slate-600 font-mono">404</h1>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Page Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The requested page could not be located or you may not have authorization to view this resource.
        </p>
        <button
          onClick={handleGoHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition-colors shadow-2xs"
        >
          <Home className="w-3.5 h-3.5" />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
