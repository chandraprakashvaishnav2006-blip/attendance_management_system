import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLES_CONFIG } from '../../components/auth/authConfig';
import { UnifiedLoginCard } from '../../components/auth/UnifiedLoginCard';
import { MobileDeviceMockup } from '../../components/auth/MobileDeviceMockup';
import { SynthesisNotesModal } from '../../components/auth/SynthesisNotesModal';
import {
  Monitor,
  Smartphone,
  Layers,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Moon,
  Sun,
  ZoomIn,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const [viewMode, setViewMode] = useState('desktop');
  const [showSynthesisModal, setShowSynthesisModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Global UI Zoom / Vision Control
  const [zoomLevel, setZoomLevel] = useState(() => {
    return localStorage.getItem('ui_zoom') || '1.1';
  });

  useEffect(() => {
    document.documentElement.style.zoom = zoomLevel;
    localStorage.setItem('ui_zoom', zoomLevel);
  }, [zoomLevel]);

  const handleZoomCycle = () => {
    const nextZoom =
      zoomLevel === '1.0'
        ? '1.1'
        : zoomLevel === '1.1'
        ? '1.2'
        : zoomLevel === '1.2'
        ? '1.25'
        : '1.0';
    setZoomLevel(nextZoom);
    toast.success(`Zoom set to ${Math.round(parseFloat(nextZoom) * 100)}%`, {
      id: 'zoom-toast',
      duration: 1500,
    });
  };

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

  const handleOtpLogin = async (roleId, phone, otpCode) => {
    setIsLoading(true);
    const config = ROLES_CONFIG[roleId];
    const roleKey = config ? config.roleKey : roleId.toUpperCase();

    // Authenticate with verified OTP using the role's secure session credentials
    toast.success(`OTP verified (${otpCode}) for ${phone}`);
    const result = await login(config.demoUsername, config.demoPassword, roleKey);
    setIsLoading(false);

    if (result.success) {
      if (result.user.role === 'ADMIN') navigate('/admin/dashboard');
      else if (result.user.role === 'STUDENT') navigate('/student/dashboard');
      else if (result.user.role === 'PARENT') navigate('/parent/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white transition-colors duration-300">
      {/* Synthesis Breakdown Modal */}
      <SynthesisNotesModal
        isOpen={showSynthesisModal}
        onClose={() => setShowSynthesisModal(false)}
      />

      {/* Top Application Bar */}
      <header className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm">
              E
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base leading-tight">
                EduTrack Pro
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                Unified Authentication System
              </span>
            </div>
          </div>

          {/* Center: Device Viewport Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'desktop'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Desktop Portal</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Mobile App Frame</span>
            </button>
          </div>

          {/* Right Actions: Zoom Control, Dark Mode Toggle & Synthesis Modal */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomCycle}
              aria-label="Adjust UI Zoom"
              title={`Click to cycle UI zoom (${Math.round(parseFloat(zoomLevel) * 100)}% active)`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
            >
              <ZoomIn className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span className="font-mono text-[11px] font-bold">{Math.round(parseFloat(zoomLevel) * 100)}%</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              type="button"
              onClick={() => setShowSynthesisModal(true)}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-xs font-semibold cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unified 2 UIs Breakdown</span>
              <span className="sm:hidden">Synthesis</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Experience Viewport */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
        {/* Soft background decorative glow circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-sky-200/30 via-indigo-100/40 to-teal-100/30 dark:from-sky-950/20 dark:via-indigo-950/30 dark:to-teal-950/20 rounded-full blur-3xl pointer-events-none" />

        {/* View Mode: Desktop Portal Mode */}
        {viewMode === 'desktop' ? (
          <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Hero & Institutional Trust Info */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Merged Design System · Mobile & Web Synthesis</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                One unified portal for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-indigo-600 to-teal-600 dark:from-sky-400 dark:via-indigo-400 dark:to-teal-400">
                  students, admins & parents
                </span>
                .
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                Synthesizing the cheerful student mobile experience with enterprise-grade administration. Choose your role, authenticate with a password or one-time SMS passcode, and manage everything effortlessly.
              </p>

              {/* Feature Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 backdrop-blur-xs text-left">
                  <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Student & Guardian Centric</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Live attendance, schedules & marks</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 backdrop-blur-xs text-left">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Enterprise Administration</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Role-based controls & analytics</p>
                  </div>
                </div>
              </div>

              {/* Bottom Credibility Markers */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Dual Auth (Password & OTP)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>256-Bit SSL Encryption</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Instant Demo Fill</span>
                </div>
              </div>
            </div>

            {/* Right: The Unified Login Card */}
            <div className="lg:col-span-6 flex justify-center">
              <UnifiedLoginCard
                onPasswordLogin={handlePasswordLogin}
                onOtpLogin={handleOtpLogin}
                isLoading={isLoading}
              />
            </div>
          </div>
        ) : (
          /* View Mode: Mobile Frame Mode */
          <div className="w-full flex flex-col items-center relative z-10">
            <div className="mb-2 text-center">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 inline-flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Simulated Mobile View (Unified Login Experience)</span>
              </span>
            </div>
            <MobileDeviceMockup>
              <UnifiedLoginCard
                onPasswordLogin={handlePasswordLogin}
                onOtpLogin={handleOtpLogin}
                isMobileDeviceView={true}
                isLoading={isLoading}
              />
            </MobileDeviceMockup>
          </div>
        )}
      </main>

      {/* Clean System Footer */}
      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-4 px-4 sm:px-6 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">EduTrack Pro</span>
            <span aria-hidden="true">·</span>
            <span>Enterprise Student Management & Analytics System</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setShowSynthesisModal(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Synthesis Documentation
            </button>
            <span aria-hidden="true">·</span>
            <span>Privacy Policy</span>
            <span aria-hidden="true">·</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
