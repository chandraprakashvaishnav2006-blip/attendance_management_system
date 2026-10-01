import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertCircle
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
  const [actionLoading, setActionLoading] = useState(false);

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
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        class_id: formData.class_id ? Number(formData.class_id) : null,
        expiry_date: formData.expiry_date || null,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Institutional Notices & Bulletins
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Broadcast announcements to students, parents, or specific classrooms with priority alerts
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
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
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{notice.publish_date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(notice)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNotice(notice);
                      setDeleteConfirmOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
        maxWidth="max-w-xl"
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
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              placeholder="e.g. Schedule for Mid-Term Examination 2026"
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
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Write the full notice content here..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              {actionLoading ? 'Saving...' : 'Publish Notice'}
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
