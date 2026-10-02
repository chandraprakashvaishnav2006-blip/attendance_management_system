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

  // Ensure default normal zoom for consistent mobile and desktop rendering
  useEffect(() => {
    document.documentElement.style.zoom = '1.0';
    localStorage.removeItem('ui_zoom');
  }, []);

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
    <div className="min-h-screen bg-[#f0f4f9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      {/* Top Application Bar */}
      <header className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/20">
              E
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-lg leading-tight">
                EduTrack Pro
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Student Management System
              </span>
            </div>
          </div>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Responsive Viewport */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative overflow-hidden">
        {/* Soft background decorative glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] md:w-[800px] h-[500px] bg-gradient-to-tr from-sky-200/40 via-indigo-100/40 to-teal-100/40 dark:from-sky-950/20 dark:via-indigo-950/30 dark:to-teal-950/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          {/* Left Column: Institutional Info & Feature Badges (Desktop primary, secondary on mobile) */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Universal Access · Mobile & Desktop Responsive</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              One unified portal for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-600 dark:from-sky-400 dark:via-indigo-400 dark:to-teal-400">
                students, admins & parents
              </span>
              .
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Access real-time attendance, examination records, announcements, and academic resources anywhere. Select your role, sign in with your credentials, and take control.
            </p>

            {/* Quick Feature Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs text-left shadow-xs">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Student & Parent Portal</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Live attendance, marks, report cards & notices</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xs text-left shadow-xs">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Enterprise Administration</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Batch attendance, CSV import & full RBAC control</p>
                </div>
              </div>
            </div>

            {/* Highlights Bar */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Encrypted Password Login</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Instant Demo Fill</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Encrypted JWT Sessions</span>
              </div>
            </div>
          </div>

          {/* Right Column: Unified Login Card (Responsive max width, prominent on mobile) */}
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
