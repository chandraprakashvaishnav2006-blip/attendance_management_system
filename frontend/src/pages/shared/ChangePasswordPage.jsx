import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Lock, Check } from 'lucide-react';
import api from '../../api/axios';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';
import toast from 'react-hot-toast';

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/\d/, 'Must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain at least one special character'),
    confirm_password: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'New passwords do not match',
    path: ['confirm_password'],
  });

export const ChangePasswordPage = () => {
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

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', data);
      if (res.success) {
        toast.success('Password changed successfully!');
        reset();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Change Password
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Keep your account secure by maintaining a strong, unique password
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-2xs">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                {...register('current_password')}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="••••••••"
              />
            </div>
            {errors.current_password && (
              <p className="text-xs text-rose-500 mt-1">{errors.current_password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                {...register('new_password')}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="••••••••"
              />
            </div>
            {errors.new_password && (
              <p className="text-xs text-rose-500 mt-1">{errors.new_password.message}</p>
            )}
            <PasswordStrengthMeter password={newPasswordValue} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                {...register('confirm_password')}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="••••••••"
              />
            </div>
            {errors.confirm_password && (
              <p className="text-xs text-rose-500 mt-1">{errors.confirm_password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {loading ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
