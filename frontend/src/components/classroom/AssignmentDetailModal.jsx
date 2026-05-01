import React from 'react';
import { 
  X, Clock, Calendar, FileText, Target, Bot, 
  Paperclip, ExternalLink, Download, CheckCircle2,
  AlertCircle, ChevronRight, Lock, Eye, Users, 
  ClipboardCheck, MessageSquare, Sparkles
} from 'lucide-react';
import StudentSubmissionPanel from './StudentSubmissionPanel';
import TeacherSubmissionsPanel from './TeacherSubmissionsPanel';
import ClassroomAIPanel from './ClassroomAIPanel';
import ClassroomComments from './ClassroomComments';

const AssignmentDetailModal = ({ 
  isOpen, 
  onClose, 
  assignment, 
  classroomId,
  canManage,
  onAttachMaterial,
  onRemoveAttachment
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState('instructions');

  if (!isOpen || !assignment) return null;

  const getDueStatus = () => {
    if (!assignment.due_at) return { label: 'No due date', color: 'text-slate-400', bg: 'bg-slate-400/10' };
    const now = new Date();
    const due = new Date(assignment.due_at);
    const diffHours = (due - now) / (1000 * 60 * 60);

    if (assignment.status === 'closed') return { label: 'Closed', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    if (diffHours < 0) return { label: 'Overdue', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    if (diffHours < 48) return { label: 'Due soon', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Upcoming', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  };

  const dueStatus = getDueStatus();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={onClose} />
      
      <div className="relative w-full h-full sm:h-[90vh] sm:max-h-[900px] sm:max-w-5xl glass dark:bg-[#0a0a0a] sm:rounded-[4rem] border-0 sm:border border-white/60 dark:border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 flex flex-col">
        {/* Header */}
        <div className="px-6 sm:px-12 py-8 sm:py-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
           <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                 <span className={`px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${dueStatus.bg} ${dueStatus.color}`}>
                   {dueStatus.label}
                 </span>
                 {assignment.status === 'draft' && (
                   <span className="px-3 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-500">
                     Draft
                   </span>
                 )}
                 <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                    <Target className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    {assignment.points} Pts
                 </div>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter max-w-2xl leading-tight">
                {assignment.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                   <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-[10px]">
                     {assignment.creator_name?.charAt(0)}
                   </div>
                   <span className="truncate max-w-[120px]">{assignment.creator_name}</span>
                </div>
                {assignment.due_at && (
                   <div className="flex items-center gap-2">
                      <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      {new Date(assignment.due_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                   </div>
                )}
              </div>
           </div>

           {/* Mobile Tabs Wrapper */}
           <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
             <div className="flex items-center gap-1.5 p-1 sm:p-1.5 glass dark:bg-white/5 rounded-xl sm:rounded-2xl border border-white/5 min-w-max">
                <button
                  onClick={() => setActiveSubTab('instructions')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'instructions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  Brief
                </button>
                <button
                  onClick={() => setActiveSubTab('work')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'work' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  {canManage ? 'Review' : 'My Work'}
                </button>
                <button
                  onClick={() => setActiveSubTab('comments')}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'comments' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                  Chat
                </button>
             </div>
           </div>

           <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-3 hover:bg-white/5 rounded-2xl transition-all text-slate-400"
           >
             <X className="w-6 sm:w-8 h-6 sm:h-8" />
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-12 pb-12 custom-scrollbar">
           {activeSubTab === 'instructions' ? (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-12">
                   {/* Instructions */}
                   <div className="space-y-6">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                         <FileText className="w-5 h-5 text-indigo-500" />
                         Instructions
                      </h3>
                      <div className="glass dark:bg-white/2 rounded-[2.5rem] p-10 border border-white/60 dark:border-white/5">
                         <div className="text-lg font-bold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                           {assignment.instructions}
                         </div>
                      </div>
                   </div>

                   {/* Attachments */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                            <Paperclip className="w-5 h-5 text-indigo-500" />
                            Classroom Resources
                         </h3>
                         {canManage && (
                           <button 
                            onClick={() => onAttachMaterial(assignment.id)}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-400 transition-all border border-white/5"
                           >
                             Attach Material
                           </button>
                         )}
                      </div>
                      
                      {assignment.attachments?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {assignment.attachments.map(att => (
                              <div key={att.id} className="group glass dark:bg-white/2 rounded-3xl p-5 border border-white/5 flex items-center justify-between hover:border-indigo-500/40 transition-all">
                                 <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                       <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                       <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{att.title}</h4>
                                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{att.attachment_type}</span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <button 
                                      className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                                      title="View"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    {canManage && (
                                       <button 
                                         onClick={() => onRemoveAttachment(att.id)}
                                         className="p-2.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                                         title="Remove"
                                       >
                                         <X className="w-4 h-4" />
                                       </button>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                           <p className="text-sm font-bold text-slate-500 uppercase tracking-widest italic">No attachments linked yet.</p>
                        </div>
                      )}
                   </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                   {/* AI Policy Card */}
                   <div className="glass dark:bg-indigo-500/5 rounded-[2.5rem] p-8 border border-indigo-500/20 relative overflow-hidden group">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all" />
                      <div className="relative z-10 space-y-6">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl">
                               <Bot className="w-6 h-6" />
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">AI Policy</h4>
                         </div>
                         
                         <div className="space-y-4">
                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Assistance Mode</span>
                               <span className={`text-sm font-black uppercase tracking-widest ${assignment.ai_help_mode === 'disabled' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                 {assignment.ai_help_mode?.replace('_', ' ')}
                               </span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
                               {assignment.ai_help_mode === 'allowed' ? 'FULL AI-STUDY ASSISTANCE IS ENABLED FOR THIS TASK.' : 
                                assignment.ai_help_mode === 'hint_only' ? 'AI TUTOR WILL ONLY PROVIDE CONCEPTUAL HINTS.' :
                                'AI TUTOR ASSISTANCE IS STRICTLY DISABLED FOR THIS ASSIGNMENT.'}
                            </p>
                         </div>
                      </div>
                   </div>

                   {/* Classroom AI Panel (Phase 10) */}
                   <div className="space-y-6">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                         <Sparkles className="w-5 h-5 text-indigo-500" />
                         Assignment AI Assistant
                      </h3>
                      <ClassroomAIPanel 
                        classroomId={classroomId} 
                        assignmentId={assignment.id} 
                        assignmentAiMode={assignment.ai_help_mode}
                      />
                   </div>

                   {/* Status Information */}
                   <div className="glass dark:bg-white/2 rounded-[2.5rem] p-8 border border-white/60 dark:border-white/5 space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Timeline Summary</h4>
                      
                      <div className="space-y-4">
                         <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl flex items-center gap-4">
                            <ClipboardCheck className="w-6 h-6 text-indigo-500 shrink-0" />
                            <p className="text-xs font-black text-indigo-500 uppercase tracking-widest leading-snug">
                               Switch to the <strong>Work</strong> tab to submit your response or review grades.
                            </p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           ) : activeSubTab === 'work' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {canManage ? (
                  <TeacherSubmissionsPanel classroomId={classroomId} assignment={assignment} />
                ) : (
                  <StudentSubmissionPanel classroomId={classroomId} assignment={assignment} />
                )}
              </div>
           ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
                 <ClassroomComments 
                    classroomId={classroomId} 
                    assignmentId={assignment.id} 
                    isManager={canManage}
                 />
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetailModal;
