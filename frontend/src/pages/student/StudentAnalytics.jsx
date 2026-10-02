import React, { useState, useEffect } from 'react';
import { LineChart, BarChart2, PieChart, Sparkles, TrendingUp, TrendingDown, Award } from 'lucide-react';
import api from '../../api/axios';
import {
  PerformanceTrendChart,
  SubjectComparisonChart,
  AttendanceDonutChart
} from '../../components/marks/PerformanceCharts';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import toast from 'react-hot-toast';

export const StudentAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anRes, attRes] = await Promise.all([
          api.get('/student/performance'),
          api.get('/student/attendance'),
        ]);
        if (anRes.success) setAnalytics(anRes.data);
        if (attRes.success) setAttendance(attRes.data);
      } catch {
        toast.error('Failed to load performance analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
          Academic Analytics & Growth Insights
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Trend trajectory across exam terms, subject benchmark comparisons, and strong/weak focal areas
        </p>
      </div>

      {/* Top Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Cumulative Percentage</span>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {analytics?.overall_percentage || 0}%
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {analytics?.total_exams || 0} evaluated examinations
          </p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Strongest Subjects</span>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {analytics?.strong_subjects?.length === 0 ? (
              <span className="text-xs text-slate-400">None flagged yet</span>
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
          <span className="text-xs font-semibold text-slate-500">Focus / Improvement Areas</span>
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

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend Line Chart */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Exam Score Trajectory (%)
            </h3>
          </div>
          <PerformanceTrendChart trends={analytics?.exam_trends || []} />
        </div>

        {/* Subject Comparison Bar Chart vs Class Average */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-500" />
              Subject Average vs Class Average
            </h3>
          </div>
          <SubjectComparisonChart subjects={analytics?.subject_comparison || []} />
        </div>

        {/* Attendance Donut Chart */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" />
              Attendance Split (Present, Absent, Late, Leave)
            </h3>
          </div>
          <AttendanceDonutChart
            present={attendance?.present_count || 0}
            absent={attendance?.absent_count || 0}
            late={attendance?.late_count || 0}
            leave={attendance?.leave_count || 0}
          />
        </div>
      </div>
    </div>
  );
};
