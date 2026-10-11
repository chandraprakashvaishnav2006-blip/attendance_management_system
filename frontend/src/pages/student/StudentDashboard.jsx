import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  Award,
  Bell,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  LineChart,
  CheckCircle,
  Clock,
  Paperclip,
  Download,
  FolderArchive
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const BACKEND_BASE = API_BASE.startsWith('http') ? API_BASE.replace(/\/api\/v1\/?$/, '') : '';
const getFileUrl = (path) => (!path ? '#' : path.startsWith('http') ? path : `${BACKEND_BASE}${path}`);

export const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/student/dashboard');
        if (res.success) setData(res.data);
      } catch {
        toast.error('Failed to load student dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <SkeletonLoader count={3} type="card" />
      </div>
    );
  }

  const attSummary = data?.attendance;
  const latestExam = data?.latest_exam_result;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hello, {data?.student_info?.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Roll: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{data?.student_info?.roll_no}</span> • {data?.student_info?.class_name || 'Class Group'} • Section {data?.student_info?.section}
          </p>
        </div>

        <button
          onClick={() => navigate('/student/analytics')}
          className="w-full sm:w-auto justify-center px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs flex items-center gap-2 transition-colors shadow-2xs"
        >
          <LineChart className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Card */}
        <div
          onClick={() => navigate('/student/attendance')}
          className="group cursor-pointer p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Attendance</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {attSummary?.overall_percentage ?? 100}%
              </span>
              <Badge variant={attSummary?.status_color || 'green'} size="sm">
                {attSummary?.status_color === 'green'
                  ? 'Good'
                  : attSummary?.status_color === 'yellow'
                  ? 'Average'
                  : 'Low'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {attSummary?.present_count || 0} of {attSummary?.total_classes || 0} classes
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-1">
            Breakdown <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>

        {/* Latest Exam Card */}
        <div
          onClick={() => navigate('/student/marks')}
          className="group cursor-pointer p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Exam Result</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {latestExam ? `${latestExam.overall_percentage}%` : 'N/A'}
              </span>
              {latestExam && (
                <Badge variant="present" size="sm">
                  Grade {latestExam.overall_grade}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {latestExam?.exam_name || 'No exams recorded'}
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-1">
            Report card <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>

        {/* Class Rank Card */}
        <div
          onClick={() => navigate('/student/analytics')}
          className="group cursor-pointer p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Class Rank</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <LineChart className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {latestExam?.rank ? `#${latestExam.rank}` : '—'}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              of {latestExam?.total_students_in_class || 20} students
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-1">
            Compare <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>

        {/* Unread Alerts Card */}
        <div
          onClick={() => navigate('/student/notifications')}
          className="group cursor-pointer p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Notifications</span>
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {data?.unread_notifications_count || 0}
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Unread notices</p>
          </div>
          <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex items-center gap-1">
            Inbox <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>

      {/* Two-Column Section: Subject Attendance & Institutional Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject-Wise Attendance Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
              Subject-Wise Attendance Breakdown
            </h3>
            <button
              onClick={() => navigate('/student/attendance')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
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
                        {subj.present_count}/{subj.total_classes} classes
                      </span>
                      <Badge variant={subj.status_color} size="sm">
                        {subj.percentage}%
                      </Badge>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
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

        {/* Upcoming Notices */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-500" />
                Latest Announcements
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

          <button
            onClick={() => navigate('/student/documents')}
            className="w-full mt-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-emerald-500" />
            Browse Study Materials
          </button>
        </div>
      </div>
    </div>
  );
};
