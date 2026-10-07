import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Terminal,
  Play,
  RotateCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Zap,
  Trash2,
  Cpu,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const FunctionTracker = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'logs'
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [purging, setPurging] = useState(false);
  
  // Logs tab state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [totalLogPages, setTotalLogPages] = useState(1);
  const [totalLogsCount, setTotalLogsCount] = useState(0);

  const autoRefreshTimerRef = useRef(null);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/admin/functions');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      if (!silent) {
        toast.error('Failed to load system functions');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchLogs = async (page = 1, silent = false) => {
    if (!silent) setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', 20);
      if (logStatusFilter) params.append('status', logStatusFilter);
      if (logSearch) params.append('search', logSearch);

      const res = await api.get(`/admin/functions/logs?${params.toString()}`);
      if (res.success) {
        setLogs(res.data.items);
        setTotalLogPages(res.data.total_pages);
        setTotalLogsCount(res.data.total);
        setLogPage(res.data.page);
      }
    } catch (err) {
      if (!silent) {
        toast.error('Failed to fetch execution logs');
      }
    } finally {
      if (!silent) setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(logPage);
    }
  }, [activeTab, logPage, logStatusFilter]);

  // Handle auto-refresh toggle
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchDashboardData(true);
        if (activeTab === 'logs') {
          fetchLogs(logPage, true);
        }
      }, 4000);
    } else if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh, activeTab, logPage, logStatusFilter]);

  const handleTestFunction = async (func) => {
    setTestingId(func.id);
    try {
      const res = await api.post(`/admin/functions/test/${func.id}`);
      if (res.success) {
        toast.success(
          `Executed ${func.display_name} in ${res.data.duration_ms}ms (saved to DB)`,
          { icon: '⚡' }
        );
        fetchDashboardData(true);
        if (activeTab === 'logs') {
          fetchLogs(1, true);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Execution test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handlePurgeLogs = async () => {
    if (!window.confirm('Are you sure you want to clear historical function execution logs? Aggregated execution counts will remain intact.')) {
      return;
    }
    setPurging(true);
    try {
      const res = await api.delete('/admin/functions/logs');
      if (res.success) {
        toast.success(res.message);
        fetchDashboardData(true);
        fetchLogs(1);
      }
    } catch (err) {
      toast.error('Failed to purge logs');
    } finally {
      setPurging(false);
    }
  };

  const getMethodBadge = (method) => {
    const m = (method || '').toUpperCase();
    if (m === 'GET') {
      return <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">GET</span>;
    }
    if (m === 'POST') {
      return <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">POST</span>;
    }
    if (m === 'PUT') {
      return <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">PUT</span>;
    }
    if (m === 'DELETE') {
      return <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">DELETE</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{m || 'SYS'}</span>;
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="card" count={4} />
        <SkeletonLoader type="table" count={8} />
      </div>
    );
  }

  const stats = data?.stats || {
    total_functions: 0,
    total_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    success_rate: 100,
    avg_latency_ms: 0,
    category_counts: {},
  };

  const allFunctions = data?.functions || [];

  // Filter categories
  const categories = ['ALL', ...Array.from(new Set(allFunctions.map((f) => f.category)))];

  const filteredFunctions = allFunctions.filter((f) => {
    const matchCategory = selectedCategory === 'ALL' || f.category === selectedCategory;
    const matchSearch =
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.display_name.toLowerCase().includes(search.toLowerCase()) ||
      (f.endpoint && f.endpoint.toLowerCase().includes(search.toLowerCase())) ||
      (f.description && f.description.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                System Functions & Database Activity
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Live DB Logging Active
                </span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Every function and API invocation in EduTrack Pro is automatically tracked, measured, and stored in the database.
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
              autoRefresh
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-Refresh {autoRefresh ? 'ON (4s)' : 'OFF'}
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => {
              fetchDashboardData();
              if (activeTab === 'logs') fetchLogs(logPage);
              toast.success('Function metrics refreshed');
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh
          </button>

          {/* Purge Logs */}
          <button
            disabled={purging}
            onClick={handlePurgeLogs}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge Logs
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Functions */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Catalog Functions</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.total_functions}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            Across {Object.keys(stats.category_counts).length} categories
          </div>
        </div>

        {/* Card 2: Total Invocations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invocations</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.total_executions}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Logged to SQLite DB
          </div>
        </div>

        {/* Card 3: Success Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.success_rate}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {stats.successful_executions} OK / {stats.failed_executions} failed
          </div>
        </div>

        {/* Card 4: Average Latency */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {stats.avg_latency_ms} <span className="text-sm font-normal text-slate-500">ms</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time execution speed
          </div>
        </div>

        {/* Card 5: Most Active Function */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Most Active</span>
            <BarChart3 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-2 truncate" title={stats.most_active_function?.display_name || 'None'}>
            {stats.most_active_function?.display_name || 'No calls yet'}
          </div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
            {stats.most_active_function ? `${stats.most_active_function.total_executions} runs` : 'Awaiting traffic'}
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Functions Catalog ({allFunctions.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Live Execution Stream
          <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-300 dark:bg-indigo-400/20 dark:text-indigo-300">
            {data?.recent_logs?.length || 0} recent
          </span>
        </button>
      </div>

      {/* TAB 1: FUNCTION CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search function by name, description, or endpoint..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Functions Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Function & Purpose</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Endpoint & Method</th>
                    <th className="py-3.5 px-4 text-center">Executions</th>
                    <th className="py-3.5 px-4 text-center">Avg Latency</th>
                    <th className="py-3.5 px-4">Last Run</th>
                    <th className="py-3.5 px-4 text-center">Last Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {filteredFunctions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12">
                        <EmptyState
                          title="No functions found"
                          description="Try refining your search keyword or selected category filter."
                          icon={Cpu}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredFunctions.map((fn) => (
                      <tr
                        key={fn.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Function & Purpose */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {fn.display_name}
                          </div>
                          <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                            {fn.name}()
                          </div>
                          {fn.description && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {fn.description}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {fn.category}
                          </span>
                        </td>

                        {/* Endpoint & Method */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {getMethodBadge(fn.http_method)}
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/60">
                              {fn.endpoint || 'Internal Routine'}
                            </span>
                          </div>
                        </td>

                        {/* Executions */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center font-bold px-2.5 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {fn.total_executions}
                          </span>
                        </td>

                        {/* Avg Latency */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">
                            {fn.avg_latency_ms} ms
                          </span>
                        </td>

                        {/* Last Run */}
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(fn.last_executed_at)}
                        </td>

                        {/* Last Status */}
                        <td className="py-3 px-4 text-center">
                          {fn.last_execution_status === 'SUCCESS' && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> OK
                            </span>
                          )}
                          {fn.last_execution_status === 'FAILED' && (
                            <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                              <XCircle className="w-3.5 h-3.5" /> Err
                            </span>
                          )}
                          {!fn.last_execution_status && (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            disabled={testingId === fn.id}
                            onClick={() => handleTestFunction(fn)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition disabled:opacity-50"
                            title="Execute live diagnostic check"
                          >
                            <Play className={`w-3 h-3 ${testingId === fn.id ? 'animate-spin' : ''}`} />
                            {testingId === fn.id ? 'Running...' : 'Test Run'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXECUTION LOGS STREAM */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs by function name, endpoint, or user..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchLogs(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <select
                value={logStatusFilter}
                onChange={(e) => {
                  setLogStatusFilter(e.target.value);
                  setLogPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="SUCCESS">Success Only</option>
                <option value="FAILED">Failed Only</option>
              </select>

              <button
                onClick={() => fetchLogs(1)}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Filter
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4">Function</th>
                    <th className="py-3.5 px-4">Endpoint & Method</th>
                    <th className="py-3.5 px-4">Invoked By</th>
                    <th className="py-3.5 px-4 text-center">Status Code</th>
                    <th className="py-3.5 px-4 text-center">Duration</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                  {logsLoading ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-500">
                        <RotateCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                        Loading log entries from database...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12">
                        <EmptyState
                          title="No execution logs found"
                          description="Functions will appear here automatically when invoked by users or background tasks."
                          icon={Terminal}
                        />
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Time */}
                        <td className="py-3 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(log.executed_at)}
                        </td>

                        {/* Function Name */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {log.function_name}
                          </span>
                        </td>

                        {/* Endpoint & Method */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {getMethodBadge(log.http_method)}
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/60">
                              {log.endpoint || '-'}
                            </span>
                          </div>
                        </td>

                        {/* Caller */}
                        <td className="py-3 px-4">
                          <div className="text-xs text-slate-900 dark:text-slate-200 font-medium">
                            {log.user_identifier || 'Anonymous'}
                          </div>
                          {log.user_role && (
                            <span className="text-[10px] uppercase font-semibold text-slate-400">
                              {log.user_role}
                            </span>
                          )}
                        </td>

                        {/* Status Code */}
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              log.status_code < 400
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {log.status_code}
                          </span>
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-4 text-center font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {log.execution_duration_ms} ms
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {log.status === 'SUCCESS' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> SUCCESS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                              <XCircle className="w-3.5 h-3.5" /> FAILED
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalLogPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs text-slate-500">
                <div>
                  Page {logPage} of {totalLogPages} ({totalLogsCount} total entries)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={logPage <= 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={logPage >= totalLogPages}
                    onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
