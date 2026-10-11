import React, { useState } from 'react';
import { ROLES_CONFIG } from './authConfig';
import { RoleSelector } from './RoleSelector';
import { RoleBanner } from './RoleBanner';
import { PasswordForm } from './PasswordForm';
import { QuickFillBar } from './QuickFillBar';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { Sparkles } from 'lucide-react';

export const UnifiedLoginCard = ({
  onPasswordLogin,
  isLoading = false,
}) => {
  const [selectedRole, setSelectedRole] = useState('student');

  // Form states initialized with working demo credentials
  const [username, setUsername] = useState(ROLES_CONFIG.student.demoUsername);
  const [password, setPassword] = useState(ROLES_CONFIG.student.demoPassword);
  const [rememberMe, setRememberMe] = useState(true);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [loginAlert, setLoginAlert] = useState(null);

  // Handle role switch
  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    const cfg = ROLES_CONFIG[newRole];
    setUsername(cfg.demoUsername);
    setPassword(cfg.demoPassword);
    setLoginAlert({
      type: 'info',
      message: `Switched to ${cfg.label} Portal. Demo credentials applied.`,
    });
    setTimeout(() => setLoginAlert(null), 3000);
  };

  // Quick fill handler
  const handleQuickFill = (role) => {
    handleRoleChange(role);
  };

  // Handle Password submit
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (onPasswordLogin) {
      onPasswordLogin(selectedRole, username, password);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto relative">
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        role={selectedRole}
      />

      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden relative transition-all">
        {/* Sleek Minimal Header */}
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 mx-auto flex items-center justify-center font-bold text-sm shadow-xs mb-3">
            E
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Sign In
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select your role to access your dashboard
          </p>
        </div>

        {/* Card Body Content */}
        <div className="px-6 pt-2 pb-6 space-y-4">
          {/* 1. Multi-Role Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              <span>Select Access Role</span>
              <span className="text-slate-500 font-normal">3 portals unified</span>
            </div>
            <RoleSelector
              selectedRole={selectedRole}
              onSelectRole={handleRoleChange}
            />
          </div>

          {/* 2. Contextual Role Info Callout */}
          <RoleBanner role={selectedRole} />

          {/* Alert Notification if any */}
          {loginAlert && (
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2 animate-fadeIn">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-500" />
              <span>{loginAlert.message}</span>
            </div>
          )}

          {/* 3. Password Login Form */}
          <div className="pt-1">
            <PasswordForm
              role={selectedRole}
              username={username}
              onChangeUsername={setUsername}
              password={password}
              onChangePassword={setPassword}
              rememberMe={rememberMe}
              onChangeRememberMe={setRememberMe}
              onSubmit={handlePasswordSubmit}
              onForgotPassword={() => setIsForgotModalOpen(true)}
              isLoading={isLoading}
            />
          </div>

          {/* 4. Quick Fill Demo Logins Bar */}
          <QuickFillBar
            onQuickFill={handleQuickFill}
            activeRole={selectedRole}
          />

          {/* 5. Footer Version Stamp */}
          <div className="pt-2 text-center">
            <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500 tracking-wider">
              v2.0.2 · EduTrack Enterprise Security
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
