import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, Send, CheckCircle2, 
  Clock, AlertCircle, X, Download, MessageSquare,
  Undo2, Star, Loader2, Paperclip
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const StudentSubmissionPanel = ({ classroomId, assignment }) => {
  const { success, error } = useNotification();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [file, setFile] = useState(null);
  const [textResponse, setTextResponse] = useState('');

  const fetchMySubmission = async () => {
    try {
      const res = await api.get(`/classrooms/${classroomId}/assignments/${assignment.id}/my-submission`);
      setSubmission(res.data);
      if (res.data) {
        setTextResponse(res.data.text_response || '');
      }
    } catch (err) {
      console.error('Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySubmission();
  }, [assignment.id]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!file && !textResponse.trim()) {
      error('Please provide a file or text response.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (textResponse) formData.append('text_response', textResponse);

    try {
      await api.post(`/classrooms/${classroomId}/assignments/${assignment.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      success('Assignment submitted successfully!');
      fetchMySubmission();
      setFile(null);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.code === 'ERR_NETWORK') {
        error('Network connection error. Your response is saved, please try again.');
      } else {
        error(detail || 'Failed to submit assignment. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!submission?.id) return;
    try {
      const res = await api.get(`/classrooms/${classroomId}/assignments/${assignment.id}/submissions/${submission.id}/file`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', submission.original_filename || 'submission');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      error('Failed to download file.');
    }
  };

  if (loading) return (
    <div className="py-12 flex justify-center">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
    </div>
  );

  const isGraded = submission?.status === 'graded';
  const isReturned = submission?.status === 'returned';
  const canResubmit = !submission || isReturned || submission.resubmission_allowed;
  
  const isPastDue = assignment.due_at && new Date(assignment.due_at) < new Date();
  const isLocked = isPastDue && !assignment.allow_late_submission && !submission;

  return (
    <div className="space-y-8">
      {/* Status Header */}
      {submission && (
        <div className="glass dark:bg-white/2 rounded-[2.5rem] p-8 border border-white/5 flex flex-wrap items-center justify-between gap-6">
           <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                isGraded ? 'bg-emerald-500/10 text-emerald-500' : 
                isReturned ? 'bg-purple-500/10 text-purple-500' :
                'bg-indigo-500/10 text-indigo-500'
              }`}>
                {isGraded ? <Star className="w-6 h-6" /> : isReturned ? <Undo2 className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              </div>
              <div>
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Submission Status</span>
                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      isGraded ? 'bg-emerald-500/10 text-emerald-500' : 
                      isReturned ? 'bg-purple-500/10 text-purple-500' :
                      submission.status === 'late' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-indigo-500/10 text-indigo-500'
                    }`}>
                      {submission.status}
                    </span>
                 </div>
                 <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {isGraded ? 'Graded & Reviewed' : isReturned ? 'Returned for Revision' : 'Work Submitted'}
                 </h4>
              </div>
           </div>

           {isGraded && submission.marks !== null && (
             <div className="px-10 py-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Your Score</span>
                <span className="text-3xl font-black text-emerald-500 tracking-tighter">{submission.marks}<span className="text-lg opacity-60"> / {assignment.points}</span></span>
             </div>
           )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Left Side: Forms/Results */}
         <div className="lg:col-span-8 space-y-8">
            {isLocked ? (
              <div className="py-20 text-center glass dark:bg-rose-500/5 border border-rose-500/20 rounded-[3rem]">
                 <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
                 <h3 className="text-2xl font-black text-rose-500 tracking-tight">Submission Locked</h3>
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">The deadline has passed and late submissions are disabled.</p>
              </div>
            ) : canResubmit ? (
              <form onSubmit={handleSubmit} className="space-y-8">
                 <div className="space-y-6">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                       <MessageSquare className="w-5 h-5 text-indigo-500" />
                       Work Response
                    </h3>
                    <textarea 
                      placeholder="Type your response here (optional if attaching a file)..."
                      className="w-full px-10 py-8 glass dark:bg-[#0a0a0a] rounded-[2.5rem] border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-base font-bold min-h-[200px] resize-none"
                      value={textResponse}
                      onChange={(e) => setTextResponse(e.target.value)}
                    />
                 </div>

                 <div className="space-y-6">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                       <Paperclip className="w-5 h-5 text-indigo-500" />
                       Attach Files
                    </h3>
                    
                    <div className={`relative border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all ${file ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 hover:border-indigo-500/20 bg-white/2'}`}>
                       <input 
                         type="file"
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                         onChange={(e) => setFile(e.target.files[0])}
                       />
                       {file ? (
                         <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                               <FileText className="w-8 h-8" />
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-900 dark:text-white truncate max-w-xs">{file.name}</p>
                               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB • Click to change</p>
                            </div>
                            <button type="button" onClick={() => setFile(null)} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-xl transition-all">
                               <X className="w-5 h-5" />
                            </button>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                               <Upload className="w-8 h-8" />
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-900 dark:text-white">Click or drag to upload your work</p>
                               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">PDF, Word, or Image files (Max 10MB)</p>
                            </div>
                         </div>
                       )}
                    </div>
                 </div>

                 <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50"
                 >
                   {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                   {submission ? 'Update Submission' : 'Turn in Assignment'}
                 </button>
              </form>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                 {/* Submitted Content View */}
                 <div className="space-y-6">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                       <FileText className="w-5 h-5 text-indigo-500" />
                       Your Submission
                    </h3>
                    <div className="glass dark:bg-white/2 rounded-[2.5rem] p-10 border border-white/5 space-y-8">
                       {submission.text_response && (
                         <div className="space-y-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Text Response</span>
                            <p className="text-lg font-bold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap italic">
                               "{submission.text_response}"
                            </p>
                         </div>
                       )}

                       {submission.file_key && (
                         <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-5">
                               <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
                                  <FileText className="w-7 h-7" />
                               </div>
                               <div>
                                  <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{submission.original_filename}</h4>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Submitted on {new Date(submission.submitted_at).toLocaleDateString()}</span>
                               </div>
                            </div>
                            <button 
                              onClick={handleDownload}
                              className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
                            >
                               <Download className="w-6 h-6" />
                            </button>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            )}
         </div>

         {/* Right Side: Feedback / Metadata */}
         <div className="lg:col-span-4 space-y-8">
            {/* Feedback Card */}
            {submission?.feedback && (
               <div className="glass dark:bg-indigo-500/5 rounded-[2.5rem] p-8 border border-indigo-500/20 relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all" />
                  <div className="relative z-10 space-y-6">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl">
                           <MessageSquare className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Teacher Feedback</h4>
                     </div>
                     <div className="p-6 bg-black/40 rounded-2xl border border-white/5">
                        <p className="text-sm font-bold text-slate-300 leading-relaxed italic">
                           "{submission.feedback}"
                        </p>
                     </div>
                  </div>
               </div>
            )}

            {/* Deadline Stats */}
            <div className="glass dark:bg-white/2 rounded-[2.5rem] p-8 border border-white/5 space-y-6">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Timeline Summary</h4>
               
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/2 rounded-2xl">
                     <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Due Date</span>
                     </div>
                     <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                        {assignment.due_at ? new Date(assignment.due_at).toLocaleDateString() : 'No Deadline'}
                     </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white/2 rounded-2xl">
                     <div className="flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Late Policy</span>
                     </div>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${assignment.allow_late_submission ? 'text-amber-500' : 'text-rose-500'}`}>
                        {assignment.allow_late_submission ? 'Late Allowed' : 'No Late Subs'}
                     </span>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default StudentSubmissionPanel;
