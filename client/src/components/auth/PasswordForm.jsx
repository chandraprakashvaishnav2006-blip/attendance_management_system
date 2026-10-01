import React, { useState } from 'react';
import { ROLES_CONFIG } from './authConfig';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export const PasswordForm = ({
  role,
  username,
  onChangeUsername,
  password,
  onChangePassword,
  rememberMe,
  onChangeRememberMe,
  onSubmit,
  onForgotPassword,
  isLoading,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const config = ROLES_CONFIG[role];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Username / Email field */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {config.inputLabel}
        </label>
        <div className="relative rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-900/30 transition-all">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <User className="w-4 h-4" />
          </div>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => onChangeUsername(e.target.value)}
            placeholder={config.placeholder}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Password field with label header row */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Password
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>
        <div className="relative rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-900/30 transition-all">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => onChangePassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full pl-10 pr-11 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none font-mono tracking-tight"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Remember me option */}
      <div className="flex items-center justify-between pt-0.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => onChangeRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-sky-600 focus:ring-sky-500 cursor-pointer"
          />
          <span className="text-xs text-slate-600 dark:text-slate-400">Remember this device</span>
        </label>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">Encrypted 256-bit</span>
      </div>

      {/* Sign In CTA Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
          role === 'admin'
            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25 active:scale-[0.99]'
            : role === 'student'
            ? 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/25 active:scale-[0.99]'
            : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/25 active:scale-[0.99]'
        } ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Verifying Credentials...</span>
          </>
        ) : (
          <>
            <span>Sign In to {config.label} Portal</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
