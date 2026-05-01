import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquare, Send, Target, Loader2 } from 'lucide-react';

const GradeSubmissionModal = ({ 
  isOpen, 
  onClose, 
  submission, 
  maxPoints,
  onSubmit,
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    marks: '',
    feedback: ''
  });

  useEffect(() => {
    if (submission) {
      setFormData({
        marks: submission.marks ?? '',
        feedback: submission.feedback ?? ''
      });
    }
  }, [submission, isOpen]);

  if (!isOpen || !submission) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      marks: parseFloat(formData.marks) || 0,
      feedback: formData.feedback
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-lg glass dark:bg-[#0a0a0a] rounded-[3rem] border border-white/60 dark:border-white/5 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Star className="w-6 h-6" />
               </div>
               <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Grade Submission</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{submission.student_name}</p>
               </div>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="px-10 py-8 space-y-8">
             <div>
                <div className="flex justify-between items-center mb-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Marks Awarded</label>
                   <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Out of {maxPoints}</span>
                </div>
                <div className="relative">
                   <Target className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                    required
                    type="number"
                    step="0.5"
                    max={maxPoints}
                    min="0"
                    placeholder="0.0"
                    className="w-full pl-14 pr-8 py-5 glass dark:bg-[#111] rounded-2xl border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-lg font-black"
                    value={formData.marks}
                    onChange={(e) => setFormData({...formData, marks: e.target.value})}
                   />
                </div>
             </div>

             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Private Feedback</label>
                <div className="relative">
                   <MessageSquare className="absolute left-6 top-6 w-4 h-4 text-slate-400" />
                   <textarea 
                    placeholder="Provide constructive feedback..."
                    className="w-full pl-14 pr-8 py-6 glass dark:bg-[#111] rounded-3xl border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-sm font-bold min-h-[150px] resize-none"
                    value={formData.feedback}
                    onChange={(e) => setFormData({...formData, feedback: e.target.value})}
                   />
                </div>
             </div>
          </div>

          {/* Footer */}
          <div className="px-10 py-8 bg-white/2 border-t border-white/5 flex items-center justify-end gap-4">
             <button
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all"
             >
               Cancel
             </button>
             <button
              disabled={loading}
              className="px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/30 flex items-center gap-3"
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
               Post Grade
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GradeSubmissionModal;
