import React, { useState } from 'react';
import { ROLES_CONFIG } from './authConfig';
import { RoleSelector } from './RoleSelector';
import { RoleBanner } from './RoleBanner';
import { PasswordForm } from './PasswordForm';
import { QuickFillBar } from './QuickFillBar';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import studentMascotImg from '../../assets/images/student_mascot_avatar_1790781142146.jpg';
import { Sparkles, Shield, GraduationCap, Users } from 'lucide-react';

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
    <div className="w-full max-w-[440px] mx-auto relative">
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        role={selectedRole}
      />

      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/70 dark:shadow-slate-950/50 border border-slate-100 dark:border-slate-800 overflow-hidden relative transition-all">
        {/* Top Hero Arch */}
        <div
          className={`relative pt-6 pb-4 px-6 text-center overflow-hidden transition-colors duration-500 ${
            selectedRole === 'admin'
              ? 'bg-gradient-to-b from-indigo-600 via-indigo-500 to-indigo-600'
              : selectedRole === 'student'
              ? 'bg-gradient-to-b from-sky-500 via-sky-400 to-sky-500'
              : 'bg-gradient-to-b from-teal-600 via-teal-500 to-teal-600'
          }`}
        >
          {/* Subtle geometric light circles */}
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/15 blur-lg pointer-events-none" />

          {/* EduTrack Pro Header Lockup */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Top Brand Pill */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-xs font-semibold shadow-inner mb-3 border border-white/25">
              <span className="w-5 h-5 rounded-md bg-white text-indigo-700 flex items-center justify-center font-black text-xs shadow-xs">
                E
              </span>
              <span>EduTrack Pro</span>
              <span className="w-1 h-1 rounded-full bg-white/70" />
              <span className="text-white/90 capitalize">{selectedRole}</span>
            </div>

            {/* Mascot Character Avatar */}
            <div className="relative group my-1">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-white/30 backdrop-blur-sm shadow-lg mx-auto flex items-center justify-center relative">
                <img
                  src={studentMascotImg}
                  alt="EduTrack Mascot"
                  className="w-full h-full object-cover rounded-full bg-white shadow-inner transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute bottom-1 right-1 p-1.5 rounded-full bg-white shadow-md text-slate-800">
                  {selectedRole === 'admin' && <Shield className="w-3.5 h-3.5 text-indigo-600" />}
                  {selectedRole === 'student' && <GraduationCap className="w-3.5 h-3.5 text-sky-600" />}
                  {selectedRole === 'parent' && <Users className="w-3.5 h-3.5 text-teal-600" />}
                </span>
              </div>
            </div>

            {/* Welcome Title */}
            <h1 className="text-white font-bold text-lg sm:text-xl tracking-tight mt-1 drop-shadow-xs">
              Sign In to Your Account
            </h1>
            <p className="text-white/80 text-xs mt-0.5 max-w-xs mx-auto">
              {selectedRole === 'admin'
                ? 'Enterprise Administration & Analytics Console'
                : selectedRole === 'student'
                ? 'Smart Learning, Attendance & Grades Portal'
                : 'Guardian Portal for Student Tracking & Fees'}
            </p>
          </div>

          {/* Smooth curved bottom wave cut-out transitioning to card surface */}
          <div className="absolute -bottom-1 left-0 right-0 h-4 bg-white dark:bg-slate-900 rounded-t-3xl" />
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
