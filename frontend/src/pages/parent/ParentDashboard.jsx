import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Baby,
  CalendarCheck,
  Award,
  Bell,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  Paperclip,
  Download,
  FolderArchive
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const BACKEND_BASE = API_BASE.startsWith('http') ? API_BASE.replace(/\/api\/v1\/?$/, '') : '';
const getFileUrl = (path) => (!path ? '#' : path.startsWith('http') ? path : `${BACKEND_BASE}${path}`);

export const ParentDashboard = () => {
  const { user, activeChild, switchActiveChild } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    if (!activeChild?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/parent/dashboard?student_id=${activeChild.id}`);
      if (res.success) setData(res.data);
    } catch {
      toast.error('Failed to load parent dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeChild?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader count={4} type="card" />
        <SkeletonLoader count={3} type="table" />
      </div>
    );
  }

  const attSummary = data?.attendance;
  const latestExam = data?.latest_exam_result;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome Card with Child Switcher if multiple */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-xl shadow-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Baby className="w-3.5 h-3.5" />
            <span>Parent & Guardian Oversight</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Child Overview: {activeChild?.name || 'Student'}
          </h1>
          <p className="text-xs text-white/80 max-w-xl">
            Roll Number: <span className="font-mono font-bold text-white">{activeChild?.roll_no}</span> • {activeChild?.class_name || 'Class'} • Section {activeChild?.section}
          </p>
        </div>

        {/* Multi-child dropdown switcher */}
        {user?.students?.length > 1 && (
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20">
            <span className="text-xs font-semibold px-2 text-white/80">Viewing Child:</span>
            {user.students.map((child) => (
              <button
                key={child.id}
                onClick={() => switchActiveChild(child)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeChild?.id === child.id
                    ? 'bg-white text-amber-900 shadow-md'
                    : 'text-white/90 hover:bg-white/20'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Child Attendance Card */}
        <div
          onClick={() => navigate('/parent/attendance')}
          className="cursor-pointer p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-500 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Child Attendance</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {attSummary?.overall_percentage ?? 100}%
              </span>
              <Badge variant={attSummary?.status_color || 'green'} size="sm">
                {attSummary?.status_color === 'green'
                  ? 'Compliant'
                  : attSummary?.status_color === 'yellow'
                  ? 'Acceptable'
                  : 'Action Needed'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {attSummary?.present_count || 0} of {attSummary?.total_classes || 0} classes attended
            </p>
          </div>
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            View attendance calendar <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Latest Exam Result Card */}
        <div
          onClick={() => navigate('/parent/marks')}
          className="cursor-pointer p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-500 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Latest Examination</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {latestExam ? `${latestExam.overall_percentage}%` : 'N/A'}
              </span>
              {latestExam && (
                <Badge variant="present" size="sm">
                  Grade {latestExam.overall_grade}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {latestExam?.exam_name || 'No published examinations'}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            View academic report <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Academic Analytics / Class Standing */}
        <div
          onClick={() => navigate('/parent/analytics')}
          className="cursor-pointer p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Class Standing</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {latestExam?.rank ? `#${latestExam.rank}` : '—'}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Class Rank out of {latestExam?.total_students_in_class || 20}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            Compare with class average <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Disciplinary Warnings / Absence Alerts */}
        <div
          onClick={() => navigate('/parent/alerts')}
          className="cursor-pointer p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-rose-500 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Alerts & Warnings</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {data?.warnings?.length || 0}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Active alerts for child</p>
          </div>
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
            View disciplinary record <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Two-Column Section: Subject Attendance & Institutional Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Child Subject Attendance Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-amber-500" />
              Subject-Wise Attendance Overview
            </h3>
            <button
              onClick={() => navigate('/parent/attendance')}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              Full Calendar
            </button>
          </div>

          <div className="space-y-4">
            {attSummary?.subjects?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No attendance logged yet</p>
            ) : (
              attSummary?.subjects?.map((subj) => (
                <div key={subj.subject_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {subj.subject_name} ({subj.subject_code})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[11px]">
                        {subj.present_count}/{subj.total_classes} attended
                      </span>
                      <Badge variant={subj.status_color} size="sm">
                        {subj.percentage}%
                      </Badge>
                    </div>
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
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notices targeted at parents */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-500" />
              Notices & Circulars
            </h3>
          </div>

          <div className="space-y-3">
            {data?.notices?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No announcements</p>
            ) : (
              data?.notices?.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={n.priority} size="sm">
                      {n.priority}
                    </Badge>
                    <span className="text-[10px] text-slate-400">{n.publish_date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {n.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {n.description}
                  </p>
                  {n.attachment_path && (
                    <div className="pt-1.5 flex items-center">
                      <a
                        href={getFileUrl(n.attachment_path)}
                        download
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 transition-colors"
                      >
                        {n.attachment_path.endsWith('.zip') ? (
                          <FolderArchive className="w-3 h-3 text-indigo-500 shrink-0" />
                        ) : (
                          <Paperclip className="w-3 h-3 text-indigo-500 shrink-0" />
                        )}
                        <span className="truncate max-w-[160px]">
                          {n.attachment_path.split('/').pop()}
                        </span>
                        <Download className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
