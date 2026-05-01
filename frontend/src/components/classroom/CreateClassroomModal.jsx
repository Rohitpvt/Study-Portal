import React, { useState } from 'react';
import { X, GraduationCap, Palette, Layout, Hash } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const CreateClassroomModal = ({ isOpen, onClose, onSuccess }) => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    course: '',
    semester: 1,
    section: '',
    banner_variant: 'blue'
  });
  const [createdClassroom, setCreatedClassroom] = useState(null);

  const bannerOptions = [
    { id: 'blue',   color: 'bg-blue-600' },
    { id: 'purple', color: 'bg-purple-600' },
    { id: 'emerald',color: 'bg-emerald-600' },
    { id: 'amber',  color: 'bg-amber-500' },
    { id: 'rose',   color: 'bg-rose-500' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/classrooms/', formData);
      success('Classroom created successfully!');
      setCreatedClassroom(res.data);
    } catch (err) {
      error(err.response?.data?.detail || 'Failed to create classroom.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setCreatedClassroom(null);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  if (createdClassroom) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        <div className="relative w-full max-w-md glass dark:bg-[#0a0a0a] rounded-[3rem] shadow-2xl border border-white/60 dark:border-white/5 p-10 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Classroom Created!</h2>
          <p className="text-slate-500 font-bold mb-8">Share this code with your students to let them join.</p>
          
          <div className="bg-slate-100 dark:bg-white/5 rounded-3xl p-6 mb-10 border border-slate-200 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 block mb-2">Join Code</span>
            <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400 tracking-widest">{createdClassroom.join_code}</span>
          </div>

          <button 
            onClick={handleCloseSuccess}
            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-3xl font-black text-sm uppercase tracking-widest transition-all"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg glass dark:bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl border border-white/60 dark:border-white/5 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">New Classroom</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Class Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Advanced AI - Batch 2025"
                  className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Subject</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. AI & ML"
                  className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Course</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. MCA"
                  className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={formData.course}
                  onChange={(e) => setFormData({...formData, course: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Semester</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="10"
                  className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Section (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. A"
                  className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={formData.section}
                  onChange={(e) => setFormData({...formData, section: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-3 block">Classroom Theme</label>
              <div className="flex gap-3">
                {bannerOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormData({...formData, banner_variant: opt.id})}
                    className={`w-10 h-10 rounded-xl transition-all duration-300 ${opt.color} ${formData.banner_variant === opt.id ? 'ring-4 ring-indigo-500/30 scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Classroom'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateClassroomModal;
