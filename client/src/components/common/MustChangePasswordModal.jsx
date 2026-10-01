import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import toast from 'react-hot-toast';

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must have at least one uppercase letter')
      .regex(/[a-z]/, 'Must have at least one lowercase letter')
      .regex(/\d/, 'Must have at least one digit')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must have at least one special character'),
    confirm_password: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const MustChangePasswordModal = () => {
  const { mustChangePassword, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const newPasswordValue = watch('new_password', '');

  if (!mustChangePassword) return null;

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', data);
      if (res.success) {
        toast.success('Password changed successfully! You may now proceed.');
        reset();
        await refreshProfile();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-300 dark:border-amber-800/80 p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Password Change Required
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your account currently has a temporary password. You must set a permanent, secure password to continue.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Current Temporary Password
            </label>
            <input
              type="password"
              {...register('current_password')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
              placeholder="••••••••"
            />
            {errors.current_password && (
              <p className="text-xs text-rose-500 mt-1">{errors.current_password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              New Permanent Password
            </label>
            <input
              type="password"
              {...register('new_password')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
              placeholder="••••••••"
            />
            {errors.new_password && (
              <p className="text-xs text-rose-500 mt-1">{errors.new_password.message}</p>
            )}
            <PasswordStrengthMeter password={newPasswordValue} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              {...register('confirm_password')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
              placeholder="••••••••"
            />
            {errors.confirm_password && (
              <p className="text-xs text-rose-500 mt-1">{errors.confirm_password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            {loading ? 'Updating Password...' : 'Save & Enter Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};
