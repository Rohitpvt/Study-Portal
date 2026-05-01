import React, { useState, useEffect } from 'react';
import { X, Layout, Plus, Trash2, Edit2, Hash } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const TopicManager = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  classroomId,
  editingTopic = null
}) => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sort_order: 0
  });

  useEffect(() => {
    if (editingTopic) {
      setFormData({
        name: editingTopic.name,
        description: editingTopic.description || '',
        sort_order: editingTopic.sort_order
      });
    } else {
      setFormData({ name: '', description: '', sort_order: 0 });
    }
  }, [editingTopic, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingTopic) {
        await api.patch(`/classrooms/${classroomId}/topics/${editingTopic.id}`, formData);
        success('Topic updated successfully!');
      } else {
        await api.post(`/classrooms/${classroomId}/topics`, formData);
        success('Topic created successfully!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      error(err.response?.data?.detail || 'Failed to save topic.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md glass dark:bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl border border-white/60 dark:border-white/5 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {editingTopic ? 'Edit Topic' : 'New Topic'}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Topic Title</label>
              <input
                required
                type="text"
                placeholder="e.g. Unit 1: Introduction"
                className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Description (Optional)</label>
              <textarea
                placeholder="Briefly describe what this topic covers..."
                className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none min-h-[100px] resize-none"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Sort Order</label>
              <input
                type="number"
                min="0"
                className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                value={formData.sort_order}
                onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-5 glass dark:bg-white/5 text-slate-600 dark:text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all border border-white/60 dark:border-white/5"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingTopic ? 'Update Topic' : 'Create Topic')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TopicManager;
