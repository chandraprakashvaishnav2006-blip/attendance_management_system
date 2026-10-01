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
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Change Password
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Keep your account secure by maintaining a strong, unique password
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                {...register('current_password')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            {errors.current_password && (
              <p className="text-xs text-rose-500 mt-1">{errors.current_password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                {...register('new_password')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            {errors.new_password && (
              <p className="text-xs text-rose-500 mt-1">{errors.new_password.message}</p>
            )}
            <PasswordStrengthMeter password={newPasswordValue} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                {...register('confirm_password')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
            className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            {loading ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
