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
      <div className="space-y-4 max-w-md">
        <h1 className="text-7xl font-black text-indigo-600 dark:text-indigo-400">404</h1>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Page Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The requested page could not be located or you may not have authorization to view this resource.
        </p>
        <button
          onClick={handleGoHome}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};
