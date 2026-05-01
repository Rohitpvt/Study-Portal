import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Reply, Trash2, 
  CheckCircle2, Lock, Globe, User, 
  MoreVertical, ChevronDown, ChevronUp,
  AlertCircle, ShieldCheck, UserCircle
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const ClassroomComments = ({ 
  classroomId, 
  assignmentId = null, 
  allowPrivate = true,
  isManager = false
}) => {
  const { userProfile } = useAuth();
  const { error, success } = useNotification();
  
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const fetchComments = async () => {
    try {
      const params = {};
      if (assignmentId) params.assignment_id = assignmentId;
      
      const res = await api.get(`/classrooms/${classroomId}/comments`, { params });
      setComments(res.data);
    } catch (err) {
      error("Failed to load comments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [classroomId, assignmentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const payload = {
        content: newComment,
        visibility: isPrivate ? 'private' : 'public',
        assignment_id: assignmentId
      };
      const res = await api.post(`/classrooms/${classroomId}/comments`, payload);
      setComments([res.data, ...comments]);
      setNewComment('');
      setIsPrivate(false);
      success(isPrivate ? "Private doubt sent to teacher." : "Comment posted.");
    } catch (err) {
      error(err.response?.data?.detail || "Failed to post comment.");
    }
  };

  const handleReply = async (parentId) => {
    if (!replyText.trim()) return;

    try {
      const res = await api.post(`/classrooms/${classroomId}/comments/${parentId}/reply`, {
        content: replyText,
        assignment_id: assignmentId
      });
      setComments([...comments, res.data]);
      setReplyingTo(null);
      setReplyText('');
      success("Reply posted.");
    } catch (err) {
      error("Failed to reply.");
    }
  };

  const handleResolve = async (commentId) => {
    try {
      await api.patch(`/classrooms/${classroomId}/comments/${commentId}/resolve`);
      setComments(comments.map(c => c.id === commentId ? { ...c, status: 'resolved' } : c));
      success("Doubt marked as resolved.");
    } catch (err) {
      error("Failed to resolve.");
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await api.delete(`/classrooms/${classroomId}/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
      success("Comment deleted.");
    } catch (err) {
      error("Failed to delete.");
    }
  };

  // Group threads
  const topLevel = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

  const CommentCard = ({ comment, isReply = false }) => {
    const isOwner = comment.sender_id === userProfile?.id;
    const canModerate = isManager || isOwner;

    return (
      <div className={`group animate-in fade-in slide-in-from-left-2 duration-300 ${isReply ? 'ml-12 mt-4' : 'mb-6'}`}>
        <div className={`p-5 glass dark:bg-white/2 rounded-[1.5rem] border ${
          comment.visibility === 'private' 
            ? 'border-amber-500/20 bg-amber-500/5' 
            : 'border-white/5'
        }`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${
                comment.sender_role === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
              }`}>
                {comment.sender_name?.substring(0,1).toUpperCase() || <User size={14}/>}
              </div>
              <div>
                <div className="flex items-center gap-2">
                   <h5 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{comment.sender_name}</h5>
                   {comment.sender_role === 'teacher' && (
                     <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 text-[8px] font-black rounded uppercase">Staff</span>
                   )}
                   {comment.visibility === 'private' && (
                     <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black rounded uppercase">
                       <Lock size={8}/> Private
                     </span>
                   )}
                </div>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                  {formatDistanceToNow(new Date(comment.created_at))} ago
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
              {!isReply && (
                <button 
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-all"
                  title="Reply"
                >
                  <Reply size={14} />
                </button>
              )}
              {canModerate && (
                <button 
                  onClick={() => handleDelete(comment.id)}
                  className="p-1.5 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500 transition-all"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
              {comment.visibility === 'private' && comment.status === 'open' && isManager && (
                 <button 
                   onClick={() => handleResolve(comment.id)}
                   className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-500 transition-all"
                   title="Mark Resolved"
                 >
                   <CheckCircle2 size={14} />
                 </button>
              )}
            </div>
          </div>
          
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </p>

          {comment.status === 'resolved' && (
            <div className="mt-3 flex items-center gap-1.5 text-emerald-500">
               <ShieldCheck size={12} />
               <span className="text-[9px] font-black uppercase tracking-widest italic">Resolved</span>
            </div>
          )}
        </div>

        {/* Reply Input */}
        {replyingTo === comment.id && (
          <div className="ml-12 mt-4 animate-in slide-in-from-top-2 duration-300">
             <div className="relative">
                <textarea 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full p-4 glass dark:bg-white/5 rounded-2xl border border-white/5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none h-20"
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                   <button 
                     onClick={() => setReplyingTo(null)}
                     className="px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={() => handleReply(comment.id)}
                     disabled={!replyText.trim()}
                     className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                   >
                     Reply
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Render Replies */}
        {getReplies(comment.id).map(reply => (
          <CommentCard key={reply.id} comment={reply} isReply={true} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* New Comment Input */}
      <div className="glass dark:bg-white/2 rounded-[2rem] p-6 border border-white/5 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
           <div className="relative group">
              <textarea 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={isPrivate ? "Ask a private doubt to the teacher..." : "Post a public comment..."}
                className={`w-full p-6 glass dark:bg-white/5 rounded-[1.5rem] border text-sm font-bold text-slate-900 dark:text-white outline-none transition-all h-28 resize-none focus:ring-2 ${
                  isPrivate ? 'border-amber-500/30 focus:ring-amber-500/20' : 'border-white/5 focus:ring-indigo-500/20'
                }`}
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-4">
                 {allowPrivate && !isManager && (
                    <button 
                      type="button"
                      onClick={() => setIsPrivate(!isPrivate)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        isPrivate ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-200 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isPrivate ? <Lock size={12}/> : <Globe size={12}/>}
                      {isPrivate ? 'Private Doubt' : 'Public'}
                    </button>
                 )}
                 <button 
                   disabled={!newComment.trim() || loading}
                   className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 active:scale-90"
                 >
                   <Send size={18} />
                 </button>
              </div>
           </div>
           {!isManager && allowPrivate && isPrivate && (
             <p className="px-2 text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2 animate-pulse">
                <AlertCircle size={10} />
                Private doubts are visible only to you and the teacher.
             </p>
           )}
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center opacity-40">
             <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Loading interaction...</span>
          </div>
        ) : topLevel.length === 0 ? (
          <div className="py-12 text-center glass dark:bg-white/2 rounded-[2rem] border border-white/5 opacity-40">
             <MessageSquare className="w-10 h-10 mx-auto mb-4 text-slate-500" />
             <p className="text-[10px] font-black uppercase tracking-widest">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          topLevel.map(comment => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
};

export default ClassroomComments;
