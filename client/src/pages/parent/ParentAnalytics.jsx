import React, { useState, useEffect } from 'react';
import { LineChart, BarChart2, TrendingUp, TrendingDown, Award } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  PerformanceTrendChart,
  SubjectComparisonChart
} from '../../components/marks/PerformanceCharts';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import toast from 'react-hot-toast';

export const ParentAnalytics = () => {
  const { activeChild } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChild?.id) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/parent/children/${activeChild.id}/performance`);
        if (res.success) setAnalytics(res.data);
      } catch {
        toast.error('Failed to load child academic analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [activeChild?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader count={3} type="card" />
        <SkeletonLoader count={2} type="card" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Child Academic Performance & Analytics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Benchmarking {activeChild?.name}'s exam trajectory against the overall class average
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Cumulative Percentage</span>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {analytics?.overall_percentage || 0}%
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Overall Rank: <span className="font-bold text-amber-600">#{analytics?.overall_rank || 'N/A'}</span>
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Strongest Subjects</span>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {analytics?.strong_subjects?.length === 0 ? (
              <span className="text-xs text-slate-400">Steady performance</span>
            ) : (
              analytics?.strong_subjects?.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  {s}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Needs Support</span>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {analytics?.weak_subjects?.length === 0 ? (
              <span className="text-xs text-slate-400">All subjects in good standing</span>
            ) : (
              analytics?.weak_subjects?.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Examination Progress Trajectory (%)
            </h3>
          </div>
          <PerformanceTrendChart trends={analytics?.exam_trends || []} />
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-500" />
              Child Average vs Class Average Benchmark
            </h3>
          </div>
          <SubjectComparisonChart subjects={analytics?.subject_comparison || []} />
        </div>
      </div>
    </div>
  );
};
