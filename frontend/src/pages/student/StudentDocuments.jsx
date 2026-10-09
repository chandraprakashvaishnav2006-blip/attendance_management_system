import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  Search,
  BookOpen,
  FolderArchive,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const BACKEND_BASE = API_BASE.startsWith('http') ? API_BASE.replace(/\/api\/v1\/?$/, '') : '';
const getFileUrl = (path) => (!path ? '#' : path.startsWith('http') ? path : `${BACKEND_BASE}${path}`);

export const StudentDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = [
    'Notes',
    'Syllabus',
    'Timetable',
    'Assignment',
    'Circular',
    'Folder / Package',
    'Other'
  ];

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const res = await api.get(`/student/documents?${params.toString()}`);
      if (res.success) setDocuments(res.data);
    } catch {
      toast.error('Failed to load study materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter, search]);

  const [downloadingDocId, setDownloadingDocId] = useState(null);

  const handleView = (doc) => {
    const viewUrl = `${BACKEND_BASE}/api/v1/documents/${doc.id}/view`;
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (doc) => {
    try {
      setDownloadingDocId(doc.id);
      const downloadUrl = `${BACKEND_BASE}/api/v1/documents/${doc.id}/download`;
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      let filename = doc.title || 'study_material';
      const ext = (doc.file_path || '').split('.').pop();
      if (ext && !filename.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
        filename = `${filename}.${ext}`;
      }
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, download_count: (d.download_count || 0) + 1 } : d))
      );
      toast.success('Downloaded successfully');
    } catch {
      const directUrl = `${BACKEND_BASE}/api/v1/documents/${doc.id}/download`;
      window.open(directUrl, '_blank');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileBadgeAndIcon = (filePath, mimeType, title = '') => {
    const ext = (filePath?.split('.').pop() || '').toLowerCase();
    const isFolder = title.startsWith('[') || ext === 'zip' || ext === 'rar' || ext === '7z';

    if (isFolder) {
      return {
        icon: <FolderArchive className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
        badge: 'FOLDER / ZIP',
        bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/60'
      };
    }
    if (ext === 'pdf' || mimeType?.includes('pdf')) {
      return {
        icon: <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
        badge: 'PDF',
        bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60'
      };
    }
    if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) {
      return {
        icon: <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
        badge: 'WORD',
        bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/60'
      };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType?.includes('sheet') || mimeType?.includes('csv')) {
      return {
        icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
        badge: ext.toUpperCase(),
        bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60'
      };
    }
    if (['ppt', 'pptx'].includes(ext) || mimeType?.includes('presentation')) {
      return {
        icon: <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
        badge: 'PPT',
        bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60'
      };
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext) || mimeType?.includes('image')) {
      return {
        icon: <ImageIcon className="w-5 h-5 text-pink-600 dark:text-pink-400" />,
        badge: 'IMAGE',
        bg: 'bg-pink-50 dark:bg-pink-950/60 border-pink-200 dark:border-pink-800/60'
      };
    }
    return {
      icon: <FileCode className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
      badge: ext ? ext.toUpperCase() : 'DOC',
      bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Learning Materials & Document Repository
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Access course syllabi, lecture notes, assignment guidelines, presentations, and learning folders
        </p>
      </div>

      {/* Search and Category Filters */}
      <div className="space-y-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by material or folder title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              categoryFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Resources ({documents.length})
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                categoryFilter === c
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Materials List / Cards */}
      {loading ? (
        <SkeletonLoader count={4} type="card" />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No study materials available"
          description="Your instructors have not uploaded materials for this category yet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const style = getFileBadgeAndIcon(doc.file_path, doc.mime_type, doc.title);
            return (
              <div
                key={doc.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="default" size="sm">
                      {doc.category}
                    </Badge>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {style.badge}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${style.bg}`}>
                      {style.icon}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {doc.subject_name || doc.class_name || 'General Academic'} • {formatFileSize(doc.file_size)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Downloaded {doc.download_count} times
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleView(doc)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="View / Open Online"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadingDocId === doc.id}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
