import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Eye,
  Search,
  Filter,
  Layers,
  Folder,
  FolderArchive,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  FolderPlus,
  Files,
  CheckCircle2,
  X
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const BACKEND_BASE = API_BASE.startsWith('http') ? API_BASE.replace(/\/api\/v1\/?$/, '') : '';
const getFileUrl = (path) => (!path ? '#' : path.startsWith('http') ? path : `${BACKEND_BASE}${path}`);

export const PDFManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [downloadingDocId, setDownloadingDocId] = useState(null);

  const handleViewDocument = async (doc) => {
    try {
      let blobData;
      try {
        blobData = await api.get(`/documents/${doc.id}/view`, { responseType: 'blob' });
      } catch {
        blobData = await api.get(`/admin/documents/${doc.id}/view`, { responseType: 'blob' });
      }
      const blob = blobData instanceof Blob ? blobData : new Blob([blobData], { type: doc.mime_type || 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      toast.error(err.message || 'Failed to preview document');
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      setDownloadingDocId(doc.id);
      let filename = doc.title || 'document';
      const ext = (doc.file_path || '').split('.').pop();
      if (ext && !filename.toLowerCase().endsWith(`.${ext.toLowerCase()}`)) {
        filename = `${filename}.${ext}`;
      }

      // Fetch file as blob via authenticated api client with endpoint fallback
      let blobData;
      try {
        blobData = await api.get(`/documents/${doc.id}/download`, {
          responseType: 'blob',
        });
      } catch {
        blobData = await api.get(`/admin/documents/${doc.id}/download`, {
          responseType: 'blob',
        });
      }

      const blob = blobData instanceof Blob ? blobData : new Blob([blobData]);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);

      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, download_count: (d.download_count || 0) + 1 } : d))
      );
      toast.success('Document downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed to download document');
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Upload Mode: 'files' | 'folder'
  const [uploadMode, setUploadMode] = useState('files');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    folder_name: '',
    category: 'Notes',
    class_id: '',
    subject_id: '',
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

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
      const res = await api.get('/admin/documents');
      if (res.success) setDocuments(res.data);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicData = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get('/admin/classes'),
        api.get('/admin/subjects'),
      ]);
      if (cRes.success) setClasses(cRes.data);
      if (sRes.success) setSubjects(sRes.data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchAcademicData();
  }, []);

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(files);
    if (uploadMode === 'files' && files.length === 1 && !uploadForm.title) {
      // Auto-fill title with original filename minus extension
      const nameWithoutExt = files[0].name.replace(/\.[^/.]+$/, '');
      setUploadForm((prev) => ({ ...prev, title: nameWithoutExt }));
    }
  };

  const handleFolderChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(files);
    // Determine folder name from webkitRelativePath
    const firstRel = files[0].webkitRelativePath || '';
    const detectedFolder = firstRel.split('/')[0] || 'Uploaded_Folder';

    setUploadForm((prev) => ({
      ...prev,
      folder_name: detectedFolder,
      title: detectedFolder,
      category: 'Folder / Package'
    }));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast.error(uploadMode === 'folder' ? 'Please select a folder' : 'Please select at least one document');
      return;
    }

    setUploading(true);
    try {
      if (uploadMode === 'files' && selectedFiles.length === 1) {
        // Single file upload
        const form = new FormData();
        form.append('title', uploadForm.title || selectedFiles[0].name);
        form.append('category', uploadForm.category);
        if (uploadForm.class_id) form.append('class_id', uploadForm.class_id);
        if (uploadForm.subject_id) form.append('subject_id', uploadForm.subject_id);
        form.append('file', selectedFiles[0]);

        const res = await api.post('/admin/documents/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.success) {
          toast.success(res.message || 'Document uploaded successfully');
          resetAndCloseModal();
          fetchDocuments();
        }
      } else {
        // Multi-file or Folder batch upload
        const form = new FormData();
        const folderTag = uploadMode === 'folder' ? (uploadForm.folder_name || uploadForm.title) : (uploadForm.title || '');
        if (folderTag) form.append('folder_name', folderTag);
        form.append('category', uploadForm.category);
        if (uploadForm.class_id) form.append('class_id', uploadForm.class_id);
        if (uploadForm.subject_id) form.append('subject_id', uploadForm.subject_id);

        for (const file of selectedFiles) {
          form.append('files', file);
        }

        const res = await api.post('/admin/documents/upload-batch', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.success) {
          toast.success(res.message || `Uploaded ${selectedFiles.length} file(s) successfully`);
          resetAndCloseModal();
          fetchDocuments();
        }
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetAndCloseModal = () => {
    setUploadModalOpen(false);
    setSelectedFiles([]);
    setUploadForm({
      title: '',
      folder_name: '',
      category: 'Notes',
      class_id: '',
      subject_id: '',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    try {
      await api.delete(`/admin/documents/${selectedDoc.id}`);
      toast.success('Document deleted');
      setDeleteConfirmOpen(false);
      fetchDocuments();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const totalFolderSize = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  // File type styling helper
  const getFileBadgeAndIcon = (filePath, mimeType, title = '') => {
    const ext = (filePath?.split('.').pop() || '').toLowerCase();
    const isFolder = title.startsWith('[') || ext === 'zip' || ext === 'rar' || ext === '7z';

    if (isFolder) {
      return {
        icon: <FolderArchive className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
        badge: 'FOLDER / ZIP',
        bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/60',
        badgeColor: 'purple'
      };
    }
    if (ext === 'pdf' || mimeType?.includes('pdf')) {
      return {
        icon: <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
        badge: 'PDF',
        bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/60',
        badgeColor: 'rose'
      };
    }
    if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) {
      return {
        icon: <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        badge: 'WORD',
        bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/60',
        badgeColor: 'blue'
      };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext) || mimeType?.includes('sheet') || mimeType?.includes('csv')) {
      return {
        icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        badge: ext.toUpperCase(),
        bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60',
        badgeColor: 'emerald'
      };
    }
    if (['ppt', 'pptx'].includes(ext) || mimeType?.includes('presentation')) {
      return {
        icon: <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        badge: 'PPT',
        bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60',
        badgeColor: 'amber'
      };
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext) || mimeType?.includes('image')) {
      return {
        icon: <ImageIcon className="w-4 h-4 text-pink-600 dark:text-pink-400" />,
        badge: 'IMAGE',
        bg: 'bg-pink-50 dark:bg-pink-950/60 border-pink-200 dark:border-pink-800/60',
        badgeColor: 'pink'
      };
    }
    return {
      icon: <FileCode className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
      badge: ext ? ext.toUpperCase() : 'DOC',
      bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      badgeColor: 'slate'
    };
  };

  const filteredDocs = documents.filter((d) => {
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchClass = (d.class_name || '').toLowerCase().includes(q);
      const matchSubject = (d.subject_name || '').toLowerCase().includes(q);
      return matchTitle || matchClass || matchSubject;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Folder className="w-7 h-7 text-indigo-600" />
            Learning Materials & Document Repository
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload and organize any documents, study notes, spreadsheets, presentations, and entire folders with tracking
          </p>
        </div>

        <button
          onClick={() => {
            setUploadMode('files');
            setUploadModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Upload className="w-4 h-4" />
          Upload Documents / Folder
        </button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, subject, or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {filteredDocs.length} material(s)
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              categoryFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Resources ({documents.length})
          </button>
          {categories.map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Table */}
      {loading ? (
        <SkeletonLoader count={4} type="table" />
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No documents or folders found"
          description="Click 'Upload Documents / Folder' above to add documents, presentations, or directory folders."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Document / Resource Title</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Class & Subject</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Downloads</th>
                  <th className="py-3.5 px-4">Uploaded</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredDocs.map((doc) => {
                  const style = getFileBadgeAndIcon(doc.file_path, doc.mime_type, doc.title);
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${style.bg}`}>
                            {style.icon}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block max-w-xs sm:max-w-md truncate">
                              {doc.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {doc.file_path.split('/').pop()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {style.badge}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="default" size="sm">
                          {doc.category}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {doc.class_name || 'All Classes'}
                        {doc.subject_name ? ` • ${doc.subject_name}` : ''}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-bold">
                        {doc.download_count} times
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewDocument(doc)}
                            title="Preview / Open in New Tab"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            disabled={downloadingDocId === doc.id}
                            title="Download Document"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDoc(doc);
                              setDeleteConfirmOpen(true);
                            }}
                            title="Delete Document"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal (Supports Single/Multi Documents AND Folders) */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={resetAndCloseModal}
        title="Upload Academic Documents & Folders"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* Mode Selector: Files vs Folder */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setUploadMode('files');
                setSelectedFiles([]);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                uploadMode === 'files'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Files className="w-4 h-4" />
              Upload Document(s)
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('folder');
                setSelectedFiles([]);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                uploadMode === 'folder'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Folder className="w-4 h-4" />
              Upload Entire Folder
            </button>
          </div>

          {/* Title or Folder Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {uploadMode === 'folder' ? 'Folder / Collection Name *' : 'Document Title (or Batch Name) *'}
            </label>
            <input
              type="text"
              required
              value={uploadMode === 'folder' ? (uploadForm.folder_name || uploadForm.title) : uploadForm.title}
              onChange={(e) => {
                const val = e.target.value;
                setUploadForm({
                  ...uploadForm,
                  title: val,
                  folder_name: val
                });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder={
                uploadMode === 'folder'
                  ? 'e.g. Unit 3 - Operating Systems Materials'
                  : 'e.g. Mathematics Chapter 4 Lecture Notes'
              }
            />
          </div>

          {/* Category, Class & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assign to Class (Optional)
              </label>
              <select
                value={uploadForm.class_id}
                onChange={(e) => setUploadForm({ ...uploadForm, class_id: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Assign to Subject (Optional)
              </label>
              {uploadForm.class_id && (
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                  Filtered by {classes.find((c) => String(c.id) === String(uploadForm.class_id))?.name}
                </span>
              )}
            </div>
            <select
              value={uploadForm.subject_id}
              onChange={(e) => setUploadForm({ ...uploadForm, subject_id: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">General / All Subjects</option>
              {(uploadForm.class_id
                ? (classes.find((c) => String(c.id) === String(uploadForm.class_id))?.subjects || [])
                : subjects
              ).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* File / Folder Selection Area */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {uploadMode === 'folder'
                ? 'Select Folder to Upload (Max 50 MB total) *'
                : 'Select Document(s) (PDF, Word, Excel, PPT, TXT, Images, ZIP) *'}
            </label>

            {uploadMode === 'files' ? (
              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-5 text-center transition-colors bg-slate-50/50 dark:bg-slate-800/40">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.md,.zip,.rar,.7z,.tar,.gz,.png,.jpg,.jpeg,.webp,.svg"
                  required={selectedFiles.length === 0}
                  onChange={handleFilesChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mb-1">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to select files or drag and drop here
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports PDF, DOCX, XLSX, PPTX, CSV, TXT, ZIP, Images (up to 50MB)
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 rounded-2xl p-5 text-center transition-colors bg-indigo-50/30 dark:bg-indigo-950/20">
                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  required={selectedFiles.length === 0}
                  onChange={handleFolderChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 flex items-center justify-center mb-1">
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to choose a folder from your computer
                  </span>
                  <span className="text-[11px] text-slate-400">
                    All valid files inside the chosen directory will be preserved and uploaded
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Selected Files / Folder Preview */}
          {selectedFiles.length > 0 && (
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {uploadMode === 'folder'
                    ? `Folder: ${uploadForm.folder_name || 'Selected'} (${selectedFiles.length} files)`
                    : `${selectedFiles.length} file(s) selected`}
                </div>
                <span className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">
                  Total: {formatFileSize(totalFolderSize)}
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {selectedFiles.slice(0, 10).map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/80 dark:bg-slate-900/80 text-[11px]"
                  >
                    <span className="truncate max-w-[280px] text-slate-700 dark:text-slate-300">
                      {file.webkitRelativePath || file.name}
                    </span>
                    <span className="font-mono text-slate-400 text-[10px]">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                ))}
                {selectedFiles.length > 10 && (
                  <div className="text-center text-[10px] text-slate-400 font-semibold pt-1">
                    + {selectedFiles.length - 10} more files in folder
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={resetAndCloseModal}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading {selectedFiles.length} file(s)...
                </>
              ) : uploadMode === 'folder' ? (
                `Upload Folder (${selectedFiles.length} files)`
              ) : selectedFiles.length > 1 ? (
                `Upload ${selectedFiles.length} Files`
              ) : (
                'Upload Document'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Document / Resource"
        message={`Delete "${selectedDoc?.title}"? This file will be permanently removed.`}
        confirmText="Confirm Delete"
        confirmVariant="danger"
      />
    </div>
  );
};
