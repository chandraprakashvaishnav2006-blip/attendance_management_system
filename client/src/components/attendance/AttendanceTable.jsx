import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { Calendar, Search, Clock } from 'lucide-react';

export const AttendanceTable = ({ records = [] }) => {
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const uniqueSubjects = Array.from(new Set(records.map((r) => r.subject_name).filter(Boolean)));

  const filtered = records.filter((r) => {
    if (filterSubject !== 'all' && r.subject_name !== filterSubject) return false;
    if (filterStatus !== 'all' && r.status.toLowerCase() !== filterStatus.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Table Filters */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Records</h4>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Subjects</option>
            {uniqueSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="leave">Leave</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No records matching filter"
          description="Try changing the subject or status filter above."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Subject Code</th>
                <th className="py-3 px-4">Period / Slot</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {row.subject_name || 'General'}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono">
                    {row.subject_code || '-'}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {row.time_slot ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        {row.time_slot}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Regular</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={row.status.toLowerCase()} size="sm">
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
