import React from 'react';
import { KeyRound, Smartphone } from 'lucide-react';

export const AuthMethodToggle = ({
  authMethod,
  onSelectMethod,
  accentColorClass = 'bg-sky-500',
}) => {
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full flex items-center justify-between border border-slate-200/80 dark:border-slate-700">
      <button
        type="button"
        onClick={() => onSelectMethod('password')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold tracking-wider uppercase rounded-full transition-all duration-200 cursor-pointer ${
          authMethod === 'password'
            ? `${accentColorClass} text-white shadow-md shadow-sky-500/20`
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <KeyRound className="w-3.5 h-3.5" />
        <span>PASSWORD</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectMethod('otp')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold tracking-wider uppercase rounded-full transition-all duration-200 cursor-pointer ${
          authMethod === 'otp'
            ? `${accentColorClass} text-white shadow-md shadow-sky-500/20`
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>OTP</span>
      </button>
    </div>
  );
};
