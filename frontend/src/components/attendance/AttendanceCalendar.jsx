import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../common/Badge';

export const AttendanceCalendar = ({ records = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map dates to attendance records: "YYYY-MM-DD" -> record
  const recordsMap = {};
  records.forEach((r) => {
    const dStr = typeof r.date === 'string' ? r.date.split('T')[0] : '';
    if (!recordsMap[dStr]) {
      recordsMap[dStr] = [];
    }
    recordsMap[dStr].push(r);
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Month Navigator */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-bold text-slate-800 dark:text-white">
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Leading empty spaces */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-16 rounded-xl bg-slate-50/50 dark:bg-slate-800/20" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const monthStr = String(month + 1).padStart(2, '0');
          const dayStr = String(day).padStart(2, '0');
          const dateKey = `${year}-${monthStr}-${dayStr}`;
          const dayRecords = recordsMap[dateKey] || [];

          // Determine majority status
          let statusBadge = null;
          if (dayRecords.length > 0) {
            const hasAbsent = dayRecords.some((r) => r.status.toLowerCase() === 'absent');
            const hasLate = dayRecords.some((r) => r.status.toLowerCase() === 'late');
            const hasLeave = dayRecords.some((r) => r.status.toLowerCase() === 'leave');

            if (hasAbsent) {
              statusBadge = <Badge variant="absent" size="sm">Absent</Badge>;
            } else if (hasLate) {
              statusBadge = <Badge variant="late" size="sm">Late</Badge>;
            } else if (hasLeave) {
              statusBadge = <Badge variant="leave" size="sm">Leave</Badge>;
            } else {
              statusBadge = <Badge variant="present" size="sm">Present</Badge>;
            }
          }

          const isSunday = new Date(year, month, day).getDay() === 0;

          return (
            <div
              key={day}
              className={`h-16 rounded-xl border p-1.5 flex flex-col justify-between transition-all ${
                isSunday
                  ? 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
              }`}
            >
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {day}
              </span>
              <div className="flex flex-wrap gap-1">
                {statusBadge}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
        <span className="font-semibold text-slate-700 dark:text-slate-300">Legend:</span>
        <div className="flex items-center gap-1.5"><Badge variant="present" size="sm">Present</Badge></div>
        <div className="flex items-center gap-1.5"><Badge variant="absent" size="sm">Absent</Badge></div>
        <div className="flex items-center gap-1.5"><Badge variant="late" size="sm">Late</Badge></div>
        <div className="flex items-center gap-1.5"><Badge variant="leave" size="sm">Leave</Badge></div>
      </div>
    </div>
  );
};
