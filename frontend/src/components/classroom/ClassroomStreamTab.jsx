import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Pin, Trash2, Edit2, 
  MoreVertical, Bell, Clock, User, CheckCircle,
  AlertCircle, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

const ClassroomStreamTab = ({ classroom, canManage }) => {
  const { success, error } = useNotification();
  const { userProfile } = useAuth();
  
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Compose State
  const [isComposing, setIsComposing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    pinned: false
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/classrooms/${classroom.id}/announcements`);
      setAnnouncements(res.data);
    } catch (err) {
      error('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [classroom.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;
    
    setSubmitting(true);
    try {
      if (editingId) {
        await api.patch(`/classrooms/${classroom.id}/announcements/${editingId}`, formData);
        success('Announcement updated.');
      } else {
        await api.post(`/classrooms/${classroom.id}/announcements`, formData);
        success('Announcement posted to stream.');
      }
      setFormData({ title: '', content: '', pinned: false });
      setIsComposing(false);
      setEditingId(null);
      fetchAnnouncements();
    } catch (err) {
      error('Failed to post announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (ann) => {
    setFormData({
      title: ann.title,
      content: ann.content,
      pinned: ann.pinned
    });
    setEditingId(ann.id);
    setIsComposing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/classrooms/${classroom.id}/announcements/${id}`);
      success('Announcement deleted.');
      fetchAnnouncements();
    } catch (err) {
      error('Failed to delete.');
    }
  };

  const togglePin = async (ann) => {
    try {
      await api.patch(`/classrooms/${classroom.id}/announcements/${ann.id}`, {
        pinned: !ann.pinned
      });
      fetchAnnouncements();
    } catch (err) {
      error('Failed to update pin status.');
    }
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
           <div key={i} className="h-40 glass dark:bg-[#0a0a0a] rounded-[2.5rem] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Compose Section */}
      {canManage && (
        <div className={`glass dark:bg-[#0a0a0a] rounded-[2.5rem] border border-white/60 dark:border-white/5 transition-all duration-500 overflow-hidden ${isComposing ? 'ring-2 ring-indigo-500/20' : ''}`}>
           {!isComposing ? (
             <button 
              onClick={() => setIsComposing(true)}
              className="w-full p-8 flex items-center gap-5 text-left group"
             >
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-all">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Announce something to your class</h3>
                  <p className="text-sm font-bold text-slate-500">Post updates, links, or reminders...</p>
                </div>
             </button>
           ) : (
             <form onSubmit={handleSubmit} className="p-8 space-y-6 animate-in slide-in-from-top-4 duration-500">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-indigo-500 rounded-xl">
                      <Send className="w-5 h-5 text-white" />
                   </div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white">
                     {editingId ? 'Edit Announcement' : 'New Announcement'}
                   </h3>
                 </div>
                 <button 
                  type="button" 
                  onClick={() => { setIsComposing(false); setEditingId(null); }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400"
                 >
                   Cancel
                 </button>
               </div>

               <input 
                required
                type="text"
                placeholder="Announcement Title"
                className="w-full px-6 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
               />

               <textarea 
                required
                placeholder="Write your announcement here..."
                className="w-full px-6 py-5 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none min-h-[150px] resize-none"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
               />

               <div className="flex items-center justify-between pt-2">
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-12 h-6 rounded-full transition-all relative ${formData.pinned ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/10'}`}>
                       <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.pinned ? 'left-7' : 'left-1'}`} />
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={formData.pinned}
                      onChange={(e) => setFormData({...formData, pinned: e.target.checked})}
                    />
                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-indigo-500">
                      Pin to Top
                    </span>
                 </label>

                 <button 
                  disabled={submitting}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                 >
                   {submitting ? 'Posting...' : (editingId ? 'Update Post' : 'Post Now')}
                 </button>
               </div>
             </form>
           )}
        </div>
      )}

      {/* Announcements Timeline */}
      <div className="space-y-6">
        {announcements.length > 0 ? (
          announcements.map((ann, idx) => (
            <div 
              key={ann.id} 
              className={`group glass dark:bg-[#0a0a0a] rounded-[2.5rem] border border-white/60 dark:border-white/5 p-8 transition-all relative ${ann.pinned ? 'ring-2 ring-indigo-500/20' : ''}`}
            >
              {ann.pinned && (
                <div className="absolute -top-3 left-10 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                  <Pin className="w-3 h-3 fill-current" />
                  Pinned
                </div>
              )}

              <div className="flex justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-lg">
                    {ann.creator_name?.substring(0,1).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{ann.creator_name}</h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <Clock className="w-3 h-3" />
                       {ann.created_at ? new Date(ann.created_at).toLocaleDateString() : '—'}
                       {ann.updated_at !== ann.created_at && (
                         <>
                           <span className="w-1 h-1 bg-slate-400 rounded-full" />
                           <span className="text-indigo-400 italic">Edited</span>
                         </>
                       )}
                    </div>
                  </div>
                </div>

                {canManage && (
                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => togglePin(ann)}
                        className={`p-2 rounded-xl transition-all ${ann.pinned ? 'text-indigo-500 bg-indigo-500/10' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                        title={ann.pinned ? "Unpin" : "Pin"}
                      >
                        <Pin className={`w-4.5 h-4.5 ${ann.pinned ? 'fill-current' : ''}`} />
                      </button>
                      <button 
                        onClick={() => handleEdit(ann)}
                        className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(ann.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                   </div>
                )}
              </div>

              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-4">{ann.title}</h3>
              <div className="text-slate-600 dark:text-slate-300 font-bold whitespace-pre-wrap leading-relaxed">
                {ann.content}
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center glass dark:bg-[#0a0a0a] rounded-[4rem] border border-white/60 dark:border-white/5">
             <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-slate-300 dark:text-white/10">
                <Bell className="w-10 h-10" />
             </div>
             <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">No Announcements</h3>
             <p className="text-slate-500 font-bold max-w-sm mx-auto">
               This is your classroom stream. Teachers will post important updates and announcements here.
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomStreamTab;
