import React, { useState, useEffect } from 'react';
import { 
  Inbox, Search, Filter, MessageSquare, 
  CheckCircle2, Clock, User, ExternalLink,
  ChevronRight, AlertCircle, RefreshCcw
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import ClassroomComments from './ClassroomComments';

const TeacherDoubtInbox = ({ classroomId }) => {
  const { error, success } = useNotification();
  
  const [doubts, setDoubts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open'); // open, resolved, all
  const [selectedDoubt, setSelectedDoubt] = useState(null);

  const fetchDoubts = async () => {
    try {
      setLoading(true);
      const params = { visibility: 'private' };
      if (filter !== 'all') params.status = filter;
      
      const res = await api.get(`/classrooms/${classroomId}/comments`, { params });
      // Only show top-level doubts in the list
      setDoubts(res.data.filter(d => !d.parent_id));
    } catch (err) {
      error("Failed to load doubts inbox.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubts();
  }, [classroomId, filter]);

  const handleResolve = async (e, id) => {
    e.stopPropagation();
    try {
      await api.patch(`/classrooms/${classroomId}/comments/${id}/resolve`);
      success("Doubt resolved.");
      fetchDoubts();
    } catch (err) {
      error("Action failed.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-280px)]">
      {/* Doubt List (Sidebar) */}
      <div className="lg:col-span-4 flex flex-col h-full glass dark:bg-white/2 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                 <Inbox size={20} className="text-white" />
              </div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Doubts Inbox</h2>
           </div>
           <button 
             onClick={fetchDoubts}
             className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all active:rotate-180 duration-500"
           >
             <RefreshCcw size={14} />
           </button>
        </div>

        <div className="p-4 border-b border-white/5 bg-slate-50 dark:bg-white/1">
           <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl">
              {['open', 'resolved', 'all'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    filter === opt 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
           {loading ? (
             Array(5).fill(0).map((_, i) => (
               <div key={i} className="h-24 glass animate-pulse rounded-2xl" />
             ))
           ) : doubts.length === 0 ? (
             <div className="py-12 text-center opacity-40">
                <AlertCircle className="w-10 h-10 mx-auto mb-4 text-slate-500" />
                <p className="text-[10px] font-black uppercase tracking-widest">No private doubts found</p>
             </div>
           ) : (
             doubts.map(doubt => (
               <div 
                 key={doubt.id}
                 onClick={() => setSelectedDoubt(doubt)}
                 className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
                   selectedDoubt?.id === doubt.id 
                     ? 'bg-indigo-600/10 border-indigo-600/30' 
                     : 'glass dark:bg-white/2 border-white/5 hover:border-white/10'
                 }`}
               >
                 <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-black">
                          {doubt.sender_name?.substring(0,1)}
                       </div>
                       <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate max-w-[100px]">
                         {doubt.sender_name}
                       </span>
                    </div>
                    {doubt.status === 'open' ? (
                       <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-lg shadow-amber-500/50" />
                    ) : (
                       <CheckCircle2 size={12} className="text-emerald-500" />
                    )}
                 </div>
                 <p className="text-[11px] font-bold text-slate-500 line-clamp-2 mb-3">
                   {doubt.content}
                 </p>
                 <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      {formatDistanceToNow(new Date(doubt.created_at))} ago
                    </span>
                    <ChevronRight size={14} className={`transition-all ${selectedDoubt?.id === doubt.id ? 'translate-x-1 text-indigo-500' : 'text-slate-600'}`} />
                 </div>
               </div>
             ))
           )}
        </div>
      </div>

      {/* Doubt Detail (Conversation) */}
      <div className="lg:col-span-8 flex flex-col h-full glass dark:bg-white/2 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative">
        {!selectedDoubt ? (
           <div className="flex-1 flex flex-col items-center justify-center opacity-30">
              <MessageSquare size={48} className="mb-6 text-slate-500" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Select a doubt to respond</h3>
           </div>
        ) : (
           <div className="flex flex-col h-full">
              <div className="p-6 border-b border-white/5 bg-slate-50 dark:bg-white/1 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-sm font-black">
                       {selectedDoubt.sender_name?.substring(0,1).toUpperCase()}
                    </div>
                    <div>
                       <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{selectedDoubt.sender_name}</h2>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">PRIVATE DOUBT</span>
                          {selectedDoubt.assignment_id && (
                             <>
                               <span className="w-1 h-1 bg-slate-700 rounded-full" />
                               <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">ASSIGNMENT REF</span>
                             </>
                          )}
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    {selectedDoubt.status === 'open' && (
                       <button 
                         onClick={(e) => handleResolve(e, selectedDoubt.id)}
                         className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                       >
                         <CheckCircle2 size={14} />
                         Mark Resolved
                       </button>
                    )}
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                 <div className="max-w-3xl mx-auto">
                    {/* The ClassroomComments component can handle the specific thread if we pass the parent doubt ID or filter by it */}
                    {/* But we need a way to only show THIS doubt thread. */}
                    {/* Let's simplify: ClassroomComments already fetches by classroom/assignment. */}
                    {/* For the inbox, we want to show the specific thread. */}
                    <ClassroomComments 
                      classroomId={classroomId} 
                      assignmentId={selectedDoubt.assignment_id}
                      isManager={true}
                    />
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDoubtInbox;
