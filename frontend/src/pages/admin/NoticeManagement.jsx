import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  Paperclip,
  Upload,
  FolderUp,
  FileText,
  FolderArchive,
  Download,
  X,
  ExternalLink
} from 'lucide-react';
import api from '../../api/axios';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SkeletonLoader } from '../../components/common/SkeletonLoader';
import { EmptyState } from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export const NoticeManagement = () => {
  const [notices, setNotices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal',
    target_audience: 'all',
    class_id: '',
    publish_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
  });

  // Attachments state
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [folderName, setFolderName] = useState('');
  const [isFolderUpload, setIsFolderUpload] = useState(false);
  const [existingAttachment, setExistingAttachment] = useState(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [actionLoading, setActionLoading] = useState(false);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/notices');
      if (res.success) setNotices(res.data);
    } catch {
      toast.error('Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/admin/classes');
      if (res.success) setClasses(res.data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchNotices();
    fetchClasses();
  }, []);

  const handleOpenCreate = () => {
    setSelectedNotice(null);
    setFormData({
      title: '',
      description: '',
      priority: 'normal',
      target_audience: 'all',
      class_id: '',
      publish_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
    });
    setAttachmentFiles([]);
    setFolderName('');
    setIsFolderUpload(false);
    setExistingAttachment(null);
    setRemoveExistingAttachment(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (notice) => {
    setSelectedNotice(notice);
    setFormData({
      title: notice.title,
      description: notice.description,
      priority: notice.priority,
      target_audience: notice.target_audience,
      class_id: notice.class_id ? String(notice.class_id) : '',
      publish_date: notice.publish_date,
      expiry_date: notice.expiry_date || '',
    });
    setAttachmentFiles([]);
    setFolderName('');
    setIsFolderUpload(false);
    setExistingAttachment(notice.attachment_path || null);
    setRemoveExistingAttachment(false);
    setModalOpen(true);
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setAttachmentFiles(selected);
    setIsFolderUpload(false);
    setFolderName('');
    setRemoveExistingAttachment(false);
  };

  const handleFolderSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    // Extract root folder name from relative path if available
    let detectedName = 'materials';
    if (selected[0]?.webkitRelativePath) {
      detectedName = selected[0].webkitRelativePath.split('/')[0] || 'materials';
    }
    setAttachmentFiles(selected);
    setIsFolderUpload(true);
    setFolderName(detectedName);
    setRemoveExistingAttachment(false);
  };

  const clearSelectedAttachment = () => {
    setAttachmentFiles([]);
    setFolderName('');
    setIsFolderUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      let finalAttachmentPath = selectedNotice ? selectedNotice.attachment_path : null;

      if (removeExistingAttachment) {
        finalAttachmentPath = null;
      }

      // If user chose files or folder to upload
      if (attachmentFiles.length > 0) {
        const uploadFormData = new FormData();
        attachmentFiles.forEach((file) => {
          uploadFormData.append('files', file);
        });
        if (isFolderUpload && folderName) {
          uploadFormData.append('folder_name', folderName);
        }

        const uploadRes = await api.post('/admin/notices/upload-attachment', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadRes.success && uploadRes.data?.file_url) {
          finalAttachmentPath = uploadRes.data.file_url;
        } else {
          throw new Error('Failed to upload announcement attachment');
        }
      }

      const payload = {
        ...formData,
        class_id: formData.class_id ? Number(formData.class_id) : null,
        expiry_date: formData.expiry_date || null,
        attachment_path: finalAttachmentPath,
      };

      if (selectedNotice) {
        await api.put(`/admin/notices/${selectedNotice.id}`, payload);
        toast.success('Notice updated successfully');
      } else {
        await api.post('/admin/notices', payload);
        toast.success('Notice published successfully');
      }
      setModalOpen(false);
      fetchNotices();
    } catch (err) {
      toast.error(err.message || 'Failed to save notice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNotice) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/notices/${selectedNotice.id}`);
      toast.success('Notice deleted');
      setDeleteConfirmOpen(false);
      fetchNotices();
    } catch (err) {
      toast.error(err.message || 'Failed to delete notice');
    } finally {
      setActionLoading(false);
    }
  };

  const totalSelectedBytes = attachmentFiles.reduce((acc, curr) => acc + (curr.size || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Institutional Notices & Bulletins
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Broadcast announcements to students, parents, or specific classrooms with downloadable file or folder attachments
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </button>
      </div>

      {/* Notices Grid */}
      {loading ? (
        <SkeletonLoader count={3} type="card" />
      ) : notices.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No institutional notices"
          description="Create your first bulletin notice to inform students and parents."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant={notice.priority} size="sm">
                    {notice.priority}
                  </Badge>
                  <span className="text-[11px] font-medium text-slate-400">
                    Audience: {notice.target_audience}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                  {notice.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line line-clamp-4">
                  {notice.description}
                </p>

                {/* Attachment Display Badge if attached */}
                {notice.attachment_path && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <a
                      href={notice.attachment_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-all group max-w-full"
                      title="Download attached material"
                    >
                      {notice.attachment_path.endsWith('.zip') ? (
                        <FolderArchive className="w-3.5 h-3.5 text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                      ) : (
                        <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="truncate max-w-[180px]">
                        {notice.attachment_path.split('/').pop()}
                      </span>
                      <Download className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-auto group-hover:translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{notice.publish_date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(notice)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit notice"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNotice(notice);
                      setDeleteConfirmOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Delete notice"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notice Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedNotice ? 'Edit Institutional Notice' : 'Post New Announcement'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notice Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Annual Sports Meet 2026 Guidelines & Schedules"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Audience
              </label>
              <select
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">Everyone (All)</option>
                <option value="students">Students Only</option>
                <option value="parents">Parents Only</option>
                <option value="class">Specific Class</option>
              </select>
            </div>
          </div>

          {formData.target_audience === 'class' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Specific Class
              </label>
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Select target class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Publish Date
              </label>
              <input
                type="date"
                required
                value={formData.publish_date}
                onChange={(e) => setFormData({ ...formData, publish_date: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Content *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Write the full notice content here..."
            />
          </div>

          {/* ATTACHMENT SECTION (FILE OR FOLDER IMPORT) */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-indigo-500" />
                  Attach Material (Any File or Entire Folder)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Import documents, circulars, media files, or full folders (auto-zipped into an archive)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  Import File
                </button>

                <input
                  ref={folderInputRef}
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={handleFolderSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <FolderUp className="w-3.5 h-3.5 text-indigo-500" />
                  Import Folder
                </button>
              </div>
            </div>

            {/* Currently selected pending files/folder */}
            {attachmentFiles.length > 0 && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    {isFolderUpload ? (
                      <FolderArchive className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {isFolderUpload
                          ? `Folder: ${folderName || 'Uploaded Folder'}`
                          : attachmentFiles[0].name}
                      </p>
                      {isFolderUpload && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                          Folder Bundle (.zip)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isFolderUpload
                        ? `${attachmentFiles.length} file${attachmentFiles.length > 1 ? 's' : ''} • Total ${formatBytes(totalSelectedBytes)}`
                        : `${formatBytes(totalSelectedBytes)}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearSelectedAttachment}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Remove selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Existing Attachment when Editing */}
            {existingAttachment && !removeExistingAttachment && attachmentFiles.length === 0 && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Paperclip className="w-4 h-4 text-indigo-500" />
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Attached:
                    </span>{' '}
                    <a
                      href={existingAttachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      {existingAttachment.split('/').pop()}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRemoveExistingAttachment(true)}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:underline"
                >
                  Remove Attachment
                </button>
              </div>
            )}

            {removeExistingAttachment && attachmentFiles.length === 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                Attachment will be removed upon saving. Select a file or folder above to replace it.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-md shadow-indigo-600/20"
            >
              {actionLoading ? 'Saving & Uploading...' : selectedNotice ? 'Update Notice' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Notice"
        message={`Are you sure you want to remove the notice "${selectedNotice?.title}"?`}
        confirmText="Confirm Delete"
        confirmVariant="danger"
        loading={actionLoading}
      />
    </div>
  );
};
