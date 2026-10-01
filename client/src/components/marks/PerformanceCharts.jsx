import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const PerformanceTrendChart = ({ trends = [] }) => {
  if (!trends || trends.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No exam history available
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trends} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="exam_name" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value}%`, 'Score']}
          />
          <Line
            type="monotone"
            dataKey="percentage"
            stroke="#6366f1"
            strokeWidth={3}
            dot={{ r: 5, fill: '#6366f1' }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const SubjectComparisonChart = ({ subjects = [] }) => {
  if (!subjects || subjects.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No subject comparison available
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={subjects} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="subject_name" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
            }}
            formatter={(val) => [`${val}%`]}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="student_avg" name="Student Average" fill="#10b981" radius={[6, 6, 0, 0]} />
          <Bar dataKey="class_avg" name="Class Average" fill="#94a3b8" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AttendanceDonutChart = ({ present = 0, absent = 0, late = 0, leave = 0 }) => {
  const data = [
    { name: 'Present', value: present, color: '#10b981' },
    { name: 'Absent', value: absent, color: '#f43f5e' },
    { name: 'Late', value: late, color: '#f59e0b' },
    { name: 'Leave', value: leave, color: '#3b82f6' },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-xs text-slate-400">
        No attendance data recorded
      </div>
    );
  }

  return (
    <div className="h-60 w-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={55}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
