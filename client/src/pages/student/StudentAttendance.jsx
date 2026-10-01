import React, { useState, useEffect } from 'react';
import { CalendarCheck, Calendar as CalendarIcon, List, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { AttendanceCalendar } from '../../components/attendance/AttendanceCalendar';
import { AttendanceTable } from '../../components/attendance/AttendanceTable';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import toast from 'react-hot-toast';

export const StudentAttendance = () => {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'table'

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const [sumRes, histRes] = await Promise.all([
          api.get('/student/attendance'),
          api.get('/student/attendance/history'),
        ]);
        if (sumRes.success) setSummary(sumRes.data);
        if (histRes.success) setHistory(histRes.data);
      } catch {
        toast.error('Failed to load attendance records');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader count={3} type="card" />
        <SkeletonLoader count={4} type="table" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Attendance Records & Calendar
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Detailed overview of subject-wise attendance percentage, threshold compliance, and monthly calendar
        </p>
      </div>

      {/* Threshold Warning Banner if below 75% */}
      {summary?.is_low_attendance && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center gap-3 text-rose-800 dark:text-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 animate-bounce" />
          <div className="text-xs">
            <p className="font-bold">Attention: Low Attendance Warning!</p>
            <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
              Your overall attendance ({summary?.overall_percentage}%) has dropped below the 75% threshold. Please attend classes regularly to prevent examination disqualification.
            </p>
          </div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Overall Attendance</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {summary?.overall_percentage}%
            </span>
            <Badge variant={summary?.status_color || 'green'} size="sm">
              {summary?.status_color}
            </Badge>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Classes</span>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {summary?.total_classes || 0}
          </h3>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Classes Attended</span>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {summary?.present_count || 0}
          </h3>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Classes Absent</span>
          <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {summary?.absent_count || 0}
          </h3>
        </div>
      </div>

      {/* Subject Wise Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary?.subjects?.map((subj) => (
          <div
            key={subj.subject_id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {subj.subject_name}
                </h4>
                <p className="text-[11px] font-mono text-slate-400">{subj.subject_code}</p>
              </div>
              <Badge variant={subj.status_color} size="sm">
                {subj.percentage}%
              </Badge>
            </div>

            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  subj.status_color === 'green'
                    ? 'bg-emerald-500'
                    : subj.status_color === 'yellow'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, subj.percentage)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Present: {subj.present_count}</span>
              <span>Absent: {subj.absent_count}</span>
              <span>Late: {subj.late_count}</span>
              <span>Leave: {subj.leave_count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* View Switcher: Calendar vs Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendar View
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Table View
            </button>
          </div>
        </div>

        {activeTab === 'calendar' ? (
          <AttendanceCalendar records={history} />
        ) : (
          <AttendanceTable records={history} />
        )}
      </div>
    </div>
  );
};
