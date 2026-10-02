import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, XCircle, Calendar, BarChart2 } from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const StudentMarks = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        const res = await api.get('/student/marks');
        if (res.success) setResults(res.data);
      } catch {
        toast.error('Failed to load marks');
      } finally {
        setLoading(false);
      }
    };
    fetchMarks();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader count={2} type="card" />
        <SkeletonLoader count={4} type="table" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Academic Report Card & Results
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Official exam-wise and subject-wise performance transcripts with letter grades and class standings
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No published examination results"
          description="Your examination marks will appear here once the administrative team publishes them."
        />
      ) : (
        <div className="space-y-6">
          {results.map((result) => (
            <div
              key={result.exam_id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              {/* Exam Header */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-800/60 dark:to-indigo-950/20 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="admin" size="sm">
                      {result.exam_type}
                    </Badge>
                    {result.date && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {result.date}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {result.exam_name}
                  </h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Overall Score
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {result.overall_percentage}%
                      </span>
                      <Badge variant="present" size="sm">
                        Grade {result.overall_grade}
                      </Badge>
                    </div>
                  </div>

                  {result.rank && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center min-w-[70px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Rank
                      </span>
                      <p className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        #{result.rank}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Subject Code</th>
                      <th className="py-3 px-4">Marks Obtained</th>
                      <th className="py-3 px-4">Max Marks</th>
                      <th className="py-3 px-4">Percentage</th>
                      <th className="py-3 px-4">Grade</th>
                      <th className="py-3 px-4 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {result.subjects.map((subj) => (
                      <tr
                        key={subj.subject_id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {subj.subject_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{subj.subject_code}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {subj.marks_obtained}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{subj.max_marks}</td>
                        <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                          {subj.percentage}%
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-black ${
                              subj.grade.startsWith('A')
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : subj.grade === 'F'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {subj.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              subj.passed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {subj.passed ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" /> Pass
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> Fail
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Summary Footer */}
                  <tfoot className="bg-slate-50 dark:bg-slate-800/40 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    <tr>
                      <td className="py-3 px-4">Total</td>
                      <td className="py-3 px-4">—</td>
                      <td className="py-3 px-4 font-mono">{result.total_obtained}</td>
                      <td className="py-3 px-4 font-mono">{result.total_max}</td>
                      <td className="py-3 px-4">{result.overall_percentage}%</td>
                      <td className="py-3 px-4">Grade {result.overall_grade}</td>
                      <td className="py-3 px-4 text-right text-emerald-600">
                        {result.overall_percentage >= 40 ? 'Passed' : 'Failed'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
