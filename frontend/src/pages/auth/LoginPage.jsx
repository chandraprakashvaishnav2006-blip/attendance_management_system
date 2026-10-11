import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLES_CONFIG } from '../../components/auth/authConfig';
import { UnifiedLoginCard } from '../../components/auth/UnifiedLoginCard';
import {
  ShieldCheck,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Moon,
  Sun,
  BookOpen,
  CalendarCheck,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handlePasswordLogin = async (roleId, identifier, password) => {
    setIsLoading(true);
    const config = ROLES_CONFIG[roleId];
    const roleKey = config ? config.roleKey : roleId.toUpperCase();

    const result = await login(identifier, password, roleKey);
    setIsLoading(false);

    if (result.success) {
      if (result.user.role === 'ADMIN') navigate('/admin/dashboard');
      else if (result.user.role === 'STUDENT') navigate('/student/dashboard');
      else if (result.user.role === 'PARENT') navigate('/parent/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Application Bar */}
      <header className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shadow-xs">
              E
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm">
                EduTrack Pro
              </span>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                Academic Management
              </span>
            </div>
          </div>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </header>

      {/* Main Responsive Viewport */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-8 sm:py-16">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Left Column: Minimal Value Proposition */}
          <div className="lg:col-span-6 space-y-5 text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Universal Academic Portal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Academic management,{' '}
              <span className="text-slate-400 dark:text-slate-500">
                distraction-free.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
              A single streamlined platform connecting administration, faculty, students, and parents with real-time tracking, transparent records, and intuitive tools.
            </p>

            {/* Subtle Minimal Feature List */}
            <div className="space-y-2.5 pt-2 max-w-md mx-auto lg:mx-0 text-left">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Attendance tracking with automatic alerts</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Examinations, marks, and performance insights</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Document repository & institutional notices</span>
              </div>
            </div>
          </div>

          {/* Right Column: Unified Login Card */}
          <div className="lg:col-span-6 flex justify-center w-full order-1 lg:order-2">
            <UnifiedLoginCard
              onPasswordLogin={handlePasswordLogin}
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>

      {/* Clean Responsive Footer */}
      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-4 px-4 sm:px-6 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">EduTrack Pro</span>
            <span aria-hidden="true">·</span>
            <span>Comprehensive Student Management System</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span>Role-Based Authentication</span>
            <span aria-hidden="true">·</span>
            <span>FastAPI Backend</span>
            <span aria-hidden="true">·</span>
            <span>Secure & Responsive</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default LoginPage;
