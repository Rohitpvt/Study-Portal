import React, { useState, useEffect } from 'react';
import { X, Send, Clock, Calendar, FileText, Target, Bot, AlertCircle, Sparkles } from 'lucide-react';

const CreateAssignmentModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  assignment = null, 
  topics = [],
  loading = false
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    points: 100,
    due_date: '',
    due_time: '23:59',
    topic_id: '',
    status: 'draft',
    ai_help_mode: 'allowed',
    allow_late_submission: false,
    late_penalty: 0
  });

  useEffect(() => {
    if (assignment) {
      const due = assignment.due_at ? new Date(assignment.due_at) : null;
      setFormData({
        title: assignment.title || '',
        description: assignment.description || '',
        instructions: assignment.instructions || '',
        points: assignment.points || 100,
        due_date: due ? due.toISOString().split('T')[0] : '',
        due_time: due ? due.toTimeString().split(' ')[0].substring(0, 5) : '23:59',
        topic_id: assignment.topic_id || '',
        status: assignment.status || 'draft',
        ai_help_mode: assignment.ai_help_mode || 'allowed',
        allow_late_submission: assignment.allow_late_submission || false,
        late_penalty: assignment.late_penalty || 0
      });
    } else {
      setFormData({
        title: '',
        description: '',
        instructions: '',
        points: 100,
        due_date: '',
        due_time: '23:59',
        topic_id: '',
        status: 'draft',
        ai_help_mode: 'allowed',
        allow_late_submission: false,
        late_penalty: 0
      });
    }
  }, [assignment, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Combine date and time
    let due_at = null;
    if (formData.due_date) {
      due_at = `${formData.due_date}T${formData.due_time || '00:00'}:00Z`;
    }

    const payload = {
      ...formData,
      due_at
    };
    
    // Remove local helper fields
    delete payload.due_date;
    delete payload.due_time;
    
    onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl glass dark:bg-[#0a0a0a] rounded-[3rem] border border-white/60 dark:border-white/5 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <form onSubmit={handleSubmit} className="flex flex-col h-[90vh] max-h-[850px]">
          {/* Header */}
          <div className="px-10 py-8 border-b border-white/60 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
                  <FileText className="w-6 h-6" />
               </div>
               <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {assignment ? 'Edit Assignment' : 'New Assignment'}
                  </h2>
                  <p className="text-sm font-bold text-slate-500">Define tasks, deadlines, and AI rules.</p>
               </div>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-10 py-8 space-y-8 custom-scrollbar">
             {/* Basic Info */}
             <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Assignment Title</label>
                   <input 
                    required
                    type="text"
                    placeholder="e.g. Unit 1 Problem Set"
                    className="w-full px-8 py-5 glass dark:bg-[#111] rounded-2xl border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-bold"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                   />
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Short Description</label>
                   <input 
                    type="text"
                    placeholder="Summary of the assignment..."
                    className="w-full px-8 py-5 glass dark:bg-[#111] rounded-2xl border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-bold"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                   />
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Full Instructions</label>
                   <textarea 
                    required
                    placeholder="Explain the task in detail..."
                    className="w-full px-8 py-6 glass dark:bg-[#111] rounded-3xl border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-bold min-h-[120px] resize-none"
                    value={formData.instructions}
                    onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                   />
                </div>
             </div>

             {/* Settings Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Points</label>
                   <div className="relative">
                      <Target className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="number"
                        className="w-full pl-14 pr-8 py-5 glass dark:bg-[#111] rounded-2xl border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-bold"
                        value={formData.points}
                        onChange={(e) => setFormData({...formData, points: parseInt(e.target.value) || 0})}
                      />
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Topic</label>
                   <select 
                    className="w-full px-8 py-5 glass dark:bg-[#111] rounded-2xl border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-bold appearance-none cursor-pointer"
                    value={formData.topic_id}
                    onChange={(e) => setFormData({...formData, topic_id: e.target.value})}
                   >
                     <option value="">No Topic</option>
                     {topics.map(t => (
                       <option key={t.id} value={t.id}>{t.title}</option>
                     ))}
                   </select>
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Due Date</label>
                   <div className="relative">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="date"
                        className="w-full pl-14 pr-8 py-5 glass dark:bg-[#111] rounded-2xl border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-bold"
                        value={formData.due_date}
                        onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      />
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Due Time</label>
                   <div className="relative">
                      <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="time"
                        className="w-full pl-14 pr-8 py-5 glass dark:bg-[#111] rounded-2xl border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-bold"
                        value={formData.due_time}
                        onChange={(e) => setFormData({...formData, due_time: e.target.value})}
                      />
                   </div>
                </div>
             </div>

             {/* AI & Rules */}
             <div className="p-8 glass dark:bg-white/5 rounded-[2.5rem] border border-white/60 dark:border-white/5 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                         <Bot className="w-6 h-6" />
                      </div>
                      <div>
                         <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Integration</h4>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Configure AI Tutor assistance level.</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-2 p-1.5 glass dark:bg-black/40 rounded-2xl border border-white/10">
                      {['allowed', 'hint_only', 'disabled'].map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setFormData({...formData, ai_help_mode: mode})}
                          className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.ai_help_mode === mode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}
                        >
                          {mode.replace('_', ' ')}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5">
                   <label className="flex items-center gap-4 cursor-pointer group">
                      <div className={`w-12 h-6 rounded-full transition-all relative ${formData.allow_late_submission ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/10'}`}>
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.allow_late_submission ? 'left-7' : 'left-1'}`} />
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={formData.allow_late_submission}
                        onChange={(e) => setFormData({...formData, allow_late_submission: e.target.checked})}
                      />
                      <div>
                        <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest block">Allow Late</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Enable submissions after due date.</span>
                      </div>
                   </label>

                   <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Late Penalty (%)</span>
                        <span className="text-[11px] font-black text-indigo-500">{formData.late_penalty}%</span>
                      </div>
                      <input 
                        disabled={!formData.allow_late_submission}
                        type="range"
                        min="0"
                        max="100"
                        className="w-full accent-indigo-600 disabled:opacity-20 cursor-pointer"
                        value={formData.late_penalty}
                        onChange={(e) => setFormData({...formData, late_penalty: parseInt(e.target.value)})}
                      />
                   </div>
                </div>
             </div>

             {/* Status */}
             <div className="flex items-center gap-4 p-2 glass dark:bg-black/40 rounded-3xl border border-white/5 w-fit">
                {['draft', 'published', 'closed'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData({...formData, status: s})}
                    className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.status === s ? (s === 'published' ? 'bg-indigo-600 text-white' : s === 'closed' ? 'bg-rose-600 text-white' : 'bg-slate-600 text-white') : 'text-slate-500 hover:text-slate-200'}`}
                  >
                    {s}
                  </button>
                ))}
             </div>
          </div>

          {/* Footer */}
          <div className="px-10 py-8 bg-slate-50/50 dark:bg-white/2 border-t border-white/60 dark:border-white/5 flex items-center justify-end gap-4">
             <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-all"
             >
               Cancel
             </button>
             <button
              disabled={loading}
              className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/30 flex items-center gap-3"
             >
               {loading ? 'Processing...' : (assignment ? 'Update Assignment' : 'Create Assignment')}
               {!loading && <Send className="w-4 h-4" />}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssignmentModal;
