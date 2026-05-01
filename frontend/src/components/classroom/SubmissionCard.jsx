import React from 'react';
import { 
  User, FileText, Download, CheckCircle2, 
  AlertCircle, Clock, ChevronRight, MessageSquare,
  Undo2, Star
} from 'lucide-react';

const SubmissionCard = ({ 
  submission, 
  onGrade, 
  onReturn, 
  onDownload 
}) => {
  const statusMap = {
    submitted: { label: 'Submitted', color: 'text-indigo-500', bg: 'bg-indigo-500/10', icon: CheckCircle2 },
    late: { label: 'Late Submission', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
    graded: { label: 'Graded', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: Star },
    returned: { label: 'Returned', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Undo2 },
    missing: { label: 'Missing', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertCircle }
  };

  const status = statusMap[submission.status] || statusMap.submitted;

  return (
    <div className="group glass dark:bg-white/2 rounded-3xl p-6 border border-white/5 hover:border-indigo-500/40 transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-5 flex-1">
           <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-xl shadow-inner">
             {submission.student_name?.charAt(0)}
           </div>
           
           <div className="flex-1 min-w-0">
             <div className="flex flex-wrap items-center gap-2 mb-2">
               <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${status.bg} ${status.color} flex items-center gap-1.5`}>
                 <status.icon className="w-3 h-3" />
                 {status.label}
               </span>
               {submission.marks !== null && (
                 <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500">
                   Score: {submission.marks}
                 </span>
               )}
             </div>
             
             <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1">
               {submission.student_name}
             </h4>
             
             <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
               <span>Roll: {submission.roll_no || 'N/A'}</span>
               <span className="w-1 h-1 bg-slate-400 rounded-full" />
               <span className="truncate">{submission.student_email}</span>
               <span className="w-1 h-1 bg-slate-400 rounded-full" />
               <span>{new Date(submission.submitted_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
             </div>
           </div>
        </div>

        <div className="flex items-center gap-2">
          {submission.file_key && (
            <button
              onClick={() => onDownload(submission)}
              className="p-3.5 glass dark:bg-white/5 hover:bg-indigo-600 hover:text-white text-slate-400 rounded-2xl transition-all border border-white/5"
              title="Download Submission"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={() => onGrade(submission)}
            className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
          >
            {submission.status === 'graded' ? 'Edit Grade' : 'Grade Task'}
          </button>
          
          {submission.status !== 'returned' && (
            <button
              onClick={() => onReturn(submission)}
              className="p-3.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-2xl transition-all border border-transparent"
              title="Return for Revision"
            >
              <Undo2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Previews */}
      {(submission.text_response || submission.feedback) && (
        <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
           {submission.text_response && (
             <div className="space-y-2">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Student Response</span>
               <div className="p-4 bg-black/20 rounded-2xl text-xs font-bold text-slate-400 line-clamp-2 italic">
                 "{submission.text_response}"
               </div>
             </div>
           )}
           {submission.feedback && (
             <div className="space-y-2">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Your Feedback</span>
               <div className="p-4 bg-indigo-500/5 rounded-2xl text-xs font-bold text-indigo-400/80 line-clamp-2">
                 {submission.feedback}
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default SubmissionCard;
