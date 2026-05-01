import React, { useState } from 'react';
import { X, Plus, Layout } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const AddTopicModal = ({ isOpen, onClose, classroomId, onSuccess }) => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sort_order: 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/classrooms/${classroomId}/topics`, formData);
      success('Topic added successfully!');
      onSuccess();
      onClose();
      setFormData({ name: '', description: '', sort_order: 0 });
    } catch (err) {
      error(err.response?.data?.detail || 'Failed to add topic.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md glass dark:bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl border border-white/60 dark:border-white/5 animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Add Topic</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Topic Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Unit 1: Introduction to AI"
                className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Description (Optional)</label>
              <textarea
                placeholder="What will students find here?"
                className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[100px]"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <button
              disabled={loading}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Topic'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTopicModal;
