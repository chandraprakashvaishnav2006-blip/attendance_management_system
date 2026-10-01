import React from 'react';
import { Check, X } from 'lucide-react';

export const PasswordStrengthMeter = ({ password = '' }) => {
  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'At least one number (0-9)', met: /\d/.test(password) },
    { label: 'At least one special character (!@#$%^&*)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const score = rules.filter((r) => r.met).length;

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-rose-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-emerald-500',
  ];

  if (!password) return null;

  return (
    <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Strength:{' '}
          <span className="font-bold text-slate-900 dark:text-white">
            {score > 0 ? strengthLabels[score - 1] : 'Too Weak'}
          </span>
        </span>
        <span className="text-xs text-slate-500">{score}/5 rules met</span>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className={`h-full rounded-full transition-all duration-300 ${
              index < score
                ? strengthColors[score - 1]
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 transition-colors ${
              rule.met
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {rule.met ? (
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
