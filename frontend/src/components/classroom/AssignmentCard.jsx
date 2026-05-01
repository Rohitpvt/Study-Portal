import React from 'react';
import { 
  ClipboardList, Clock, Calendar, AlertCircle, 
  CheckCircle2, Paperclip, MoreVertical, Edit2, 
  Trash2, ExternalLink, Bot, HelpCircle, ShieldOff
} from 'lucide-react';

const AssignmentCard = ({ 
  assignment, 
  canManage, 
  onView, 
  onEdit, 
  onDelete 
}) => {
  const getDueStatus = () => {
    if (!assignment.due_at) return { label: 'No due date', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Calendar };
    
    const now = new Date();
    const due = new Date(assignment.due_at);
    const diffHours = (due - now) / (1000 * 60 * 60);

    if (assignment.status === 'closed') return { label: 'Closed', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertCircle };
    if (diffHours < 0) return { label: 'Overdue', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertCircle };
    if (diffHours < 48) return { label: 'Due soon', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock };
    return { label: 'Upcoming', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 };
  };

  const statusMap = {
    draft: { label: 'Draft', color: 'text-slate-400', bg: 'bg-slate-400/10' },
    published: { label: 'Published', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    closed: { label: 'Closed', color: 'text-rose-500', bg: 'bg-rose-500/10' }
  };

  const aiHelpMap = {
    allowed: { label: 'AI Help Allowed', color: 'text-emerald-500', icon: SparklesIcon },
    hint_only: { label: 'Hints Only', color: 'text-amber-500', icon: Bot },
    disabled: { label: 'AI Disabled', color: 'text-rose-500', icon: ShieldOff }
  };

  const dueStatus = getDueStatus();
  const status = statusMap[assignment.status];
  const aiMode = aiHelpMap[assignment.ai_help_mode] || aiHelpMap.allowed;

  return (
    <div className="group glass dark:bg-[#0d0d0d] rounded-3xl border border-white/60 dark:border-white/5 p-6 hover:border-indigo-500/40 transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-5 flex-1">
           <div className={`p-4 rounded-2xl ${dueStatus.bg} ${dueStatus.color} shadow-lg transition-transform group-hover:scale-110 flex-shrink-0`}>
              <ClipboardList className="w-6 h-6" />
           </div>
           
           <div className="flex-1 min-w-0">
             <div className="flex flex-wrap items-center gap-2 mb-2">
               {canManage && (
                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${status.bg} ${status.color}`}>
                   {status.label}
                 </span>
               )}
               <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${dueStatus.bg} ${dueStatus.color}`}>
                 <dueStatus.icon className="w-3 h-3" />
                 {dueStatus.label}
               </div>
               <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 ${aiMode.color}`}>
                 <aiMode.icon className="w-3 h-3" />
                 {aiMode.label}
               </div>
               {assignment.attachments?.length > 0 && (
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <Paperclip className="w-3 h-3" />
                    {assignment.attachments.length} Attachments
                 </div>
               )}
             </div>
             
             <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-indigo-500 transition-colors truncate">
               {assignment.title}
             </h4>
             
             <p className="text-sm font-bold text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">
               {assignment.description || assignment.instructions.substring(0, 100)}
             </p>

             <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               <span>{assignment.points} Points</span>
               {assignment.due_at && (
                 <>
                   <span className="w-1 h-1 bg-slate-400 rounded-full" />
                   <span>Due {new Date(assignment.due_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                 </>
               )}
               {assignment.creator_name && (
                 <>
                   <span className="w-1 h-1 bg-slate-400 rounded-full" />
                   <span className="text-indigo-500">Assigned by {assignment.creator_name}</span>
                 </>
               )}
             </div>
           </div>
        </div>

        <div className="flex items-center gap-2 md:self-center">
          <button
            onClick={() => onView(assignment)}
            className="flex items-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
          >
            Open Assignment
          </button>
          
          {canManage && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(assignment)}
                className="p-3 glass dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-500 rounded-2xl transition-all border border-white/60 dark:border-white/5"
                title="Edit"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDelete(assignment.id)}
                className="p-3 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-2xl transition-all border border-transparent hover:border-rose-500/20"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Reusable icon for AI
const SparklesIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export default AssignmentCard;
