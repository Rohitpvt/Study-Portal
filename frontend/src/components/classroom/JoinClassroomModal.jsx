import React, { useState } from 'react';
import { X, Hash, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const JoinClassroomModal = ({ isOpen, onClose, onSuccess }) => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (joinCode.length < 6) return;
    
    setLoading(true);
    try {
      await api.post('/classrooms/join', { join_code: joinCode.trim().toUpperCase() });
      success('Successfully joined the classroom!');
      onSuccess();
      onClose();
    } catch (err) {
      error(err.response?.data?.detail || 'Failed to join classroom.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md glass dark:bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl border border-white/60 dark:border-white/5 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20">
                <Hash className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Join Class</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 px-1">
                Enter the 6-character code provided by your teacher to join the classroom.
              </p>
              <input
                required
                type="text"
                placeholder="ABC123"
                maxLength={10}
                className="w-full px-6 py-5 bg-slate-50 dark:bg-[#111] rounded-2xl text-2xl font-black text-center uppercase tracking-[0.5em] border border-slate-200 dark:border-white/5 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all placeholder:tracking-normal placeholder:font-bold placeholder:text-slate-300"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
            </div>

            <button
              disabled={loading || joinCode.length < 6}
              className="w-full py-5 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                <>
                  Join Classroom
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinClassroomModal;
