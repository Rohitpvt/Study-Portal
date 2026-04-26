import { useEffect, useState } from 'react';
import api from '../services/api';
import { UploadIcon, Activity, CheckCircle2, XCircle, Clock, FileText, Info, RotateCw, Trash2, Send } from 'lucide-react';
import { ACADEMIC_DATA, CATEGORIES, SEMESTERS } from '../constants/academicData';
import { useNotification } from '../context/NotificationContext';
import { Skeleton, SkeletonTableRow, SkeletonCard } from '../components/common/Skeleton';
import MaterialLoader from '../components/common/MaterialLoader';
import EmptyState from '../components/common/EmptyState';
import { trackEvent } from '../services/analytics';

export default function Contributions() {
  const { success, error: toastError, info } = useNotification();
  const [contributions, setContributions] = useState([]);
  
  // Upload State
  const [file, setFile] = useState(null);
  const [uploadData, setUploadData] = useState({ title: '', description: '', course: '', subject: '', category: 'NOTES', semester: 1 });
  const [uploading, setUploading] = useState(false);

  // Status Tracking & Polling
  const [statuses, setStatuses] = useState({}); // keyed by id
  const [isPolling, setIsPolling] = useState(false);
  const [actionLoading, setActionLoading] = useState({}); // { [id]: 'reprocess' | 'delete' | null }

  const STATUS_CONFIG = {
    'upload_received': { label: 'Upload Received', color: 'bg-slate-400', progress: 10 },
    'file_stored': { label: 'File Secured in Vault', color: 'bg-blue-400', progress: 20 },
    'text_extraction_in_progress': { label: 'Analyzing Document Structure', color: 'bg-indigo-400', progress: 30 },
    'grammar_check_in_progress': { label: 'Verifying Linguistic Quality', color: 'bg-purple-400', progress: 40 },
    'plagiarism_check_in_progress': { label: 'Checking Originality', color: 'bg-violet-400', progress: 50 },
    'toxicity_check_in_progress': { label: 'Content Safety Screening', color: 'bg-pink-400', progress: 60 },
    'metadata_validation_in_progress': { label: 'Validating Academic Metadata', color: 'bg-fuchsia-400', progress: 75 },
    'final_scoring_in_progress': { label: 'Synthesizing Final Assessment', color: 'bg-rose-400', progress: 90 },
    'processing_complete': { label: 'Assessment Algorithm Stabilized', color: 'bg-emerald-500', progress: 100 },
    'sent_for_admin_review': { label: 'Queued for Human Review', color: 'bg-teal-500', progress: 100 },
    'approved': { label: 'Admin Audit Successful', color: 'bg-emerald-600', progress: 100 },
    'rejected': { label: 'Criteria Not Met', color: 'bg-rose-600', progress: 100 },
    'processing_failed': { label: 'Pipeline Interrupted', color: 'bg-amber-600', progress: 0 }
  };

  const TERMINAL_STATES = ['approved', 'rejected', 'processing_failed'];

  const fetchStatuses = async () => {
    try {
      const res = await api.get('/contributions/mine/status');
      const newStatuses = {};
      res.data.items.forEach(s => {
        newStatuses[s.contribution_id] = s;
      });
      setStatuses(prev => ({ ...prev, ...newStatuses }));
      
      // Stop polling if everyone is terminal
      const anyActive = res.data.items.some(s => !TERMINAL_STATES.includes(s.processing_status));
      if (!anyActive) setIsPolling(false);
    } catch (err) {
      console.error("Polling status failed:", err);
    }
  };

  const fetchMine = async () => {
    try {
      const res = await api.get('/contributions/mine');
      setContributions(res.data.items || []);
      
      // Check if we need to start polling based on initial fetch
      const anyActive = res.data.items.some(c => 
        c.processing_status && !TERMINAL_STATES.includes(c.processing_status)
      );
      if (anyActive) setIsPolling(true);
      
      // Populate initial statuses from the main fetch
      const initialStatuses = {};
      res.data.items.forEach(c => {
        if (c.processing_status) {
          initialStatuses[c.id] = {
            processing_status: c.processing_status,
            final_recommendation: c.final_recommendation,
            student_feedback_message: c.student_feedback_message
          };
        }
      });
      setStatuses(prev => ({ ...prev, ...initialStatuses }));
    } catch (err) {
      console.error(err);
    } finally {
      if (contributions[0] === 'polling_skeleton') setContributions([]);
    }
  };

  useEffect(() => {
    setContributions(['polling_skeleton']);
    fetchMine();
  }, []);

  // Set up the poll
  useEffect(() => {
    let intervalId;
    if (isPolling) {
      intervalId = setInterval(fetchStatuses, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPolling]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toastError("Please select a file to submit.");
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', uploadData.title);
    formData.append('description', uploadData.description);
    formData.append('course', uploadData.course);
    formData.append('subject', uploadData.subject);
    formData.append('category', uploadData.category);
    if (uploadData.semester) {
      formData.append('semester', parseInt(uploadData.semester));
    }

    try {
      await api.post('/contributions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      success("Contribution submitted successfully! AI Pipeline initialized.");
      trackEvent('contribution_upload', { 
        course: uploadData.course, 
        category: uploadData.category 
      });
      setFile(null);
      // Trigger immediate refresh and start polling
      await fetchMine();
      setIsPolling(true);
    } catch (err) {
       toastError(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleReprocess = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'reprocess' }));
    try {
      await api.post(`/contributions/${id}/reprocess`);
      success("Reprocessing pipeline restarted.");
      await fetchMine();
    } catch (err) {
      toastError(err.response?.data?.detail || "Failed to restart pipeline.");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this failed submission record? This action cannot be undone.")) return;
    
    setActionLoading(prev => ({ ...prev, [id]: 'delete' }));
    try {
      await api.delete(`/contributions/${id}`);
      success("Submission record removed.");
      await fetchMine();
    } catch (err) {
      toastError(err.response?.data?.detail || "Failed to remove submission.");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const uploadSubjects = uploadData.course ? ACADEMIC_DATA[uploadData.course] : [];

  const getStatusBadge = (status, processingStatus) => {
    // Priority: New Pipeline States -> Legacy Admin Status
    if (processingStatus === 'rejected') {
      return <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black bg-rose-100 text-rose-700 shadow-sm border border-rose-200 uppercase tracking-widest"><XCircle className="w-3.5 h-3.5 mr-2"/> ADMIN REJECTED</span>;
    }
    if (processingStatus === 'processing_failed') {
      return <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 text-slate-700 shadow-sm border border-slate-200 uppercase tracking-widest"><XCircle className="w-3.5 h-3.5 mr-2"/> PIPELINE FAILED</span>;
    }
    if (processingStatus === 'approved') {
      return <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200 uppercase tracking-widest"><CheckCircle2 className="w-3.5 h-3.5 mr-2"/> ADMIN APPROVED</span>;
    }
    if (processingStatus === 'sent_for_admin_review' || processingStatus === 'processing_complete') {
      return <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 uppercase tracking-widest"><Activity className="w-3.5 h-3.5 mr-2"/> AWAITING AUDIT</span>;
    }

    switch(status) {
      case 'APPROVED': return <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-200 uppercase tracking-widest"><CheckCircle2 className="w-3.5 h-3.5 mr-2"/> ADMIN APPROVED</span>;
      case 'REJECTED': return <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black bg-rose-100 text-rose-700 shadow-sm border border-rose-200 uppercase tracking-widest"><XCircle className="w-3.5 h-3.5 mr-2"/> ADMIN REJECTED</span>;
      case 'AI_REVIEWED': return <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200 uppercase tracking-widest"><Activity className="w-3.5 h-3.5 mr-2"/> AI REVIEWED</span>;
      default: return <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black bg-amber-100 text-amber-700 shadow-sm border border-amber-200 uppercase tracking-widest"><Clock className="w-3.5 h-3.5 mr-2"/> QUEUED</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      
      {/* Global Processing Overlays */}
      {(uploading || Object.values(actionLoading).some(v => !!v)) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
          <div className="max-w-md w-full p-10 glass rounded-[3rem] shadow-2xl relative overflow-hidden h-[300px]">
             <MaterialLoader 
               message={
                 uploading 
                   ? "Initializing AI Quality Pipeline..." 
                   : "Recalibrating Assessment algorithm..."
               } 
             />
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="glass-card dark:bg-slate-900/50 shadow-2xl border-0 p-10 mt-6 relative overflow-hidden group transition-colors">
        <div className="absolute top-0 left-0 w-2 h-full premium-gradient"></div>
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tighter transition-colors">
             <div className="p-3 premium-gradient rounded-2xl shadow-lg ring-4 ring-indigo-50 dark:ring-indigo-900/40">
               <UploadIcon className="text-white w-6 h-6"/>
             </div>
             Knowledge Submission
           </h2>
           <div className="hidden md:flex items-center gap-2 px-4 py-2 glass dark:bg-slate-800/40 rounded-2xl text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">
             <Info className="w-3.5 h-3.5"/> Quality Check Active
           </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-base mt-2 mb-10 font-bold opacity-80 leading-relaxed max-w-2xl transition-colors">
          Contribute to the collective intelligence. Your materials undergo high-fidelity AI quality vetting before platform indexing.
        </p>
        
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <input type="text" placeholder="Strategic Title (e.g. OS Module 1 Summary)" required className="glass dark:bg-slate-800/40 p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none border-white/60 dark:border-slate-700/50 text-slate-900 dark:text-white transition-all" value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} />
          
          <select className="glass dark:bg-slate-800/40 p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none border-white/60 dark:border-slate-700/50 text-slate-900 dark:text-white cursor-pointer transition-all" required value={uploadData.course} onChange={e => setUploadData({...uploadData, course: e.target.value, subject: ''})}>
            <option value="" className="dark:bg-slate-900">Select Domain</option>
            {Object.keys(ACADEMIC_DATA).map(course => (
              <option key={course} value={course} className="dark:bg-slate-900">{course}</option>
            ))}
          </select>

          <div className="relative">
            <select 
              className="glass dark:bg-slate-800/40 p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none border-white/60 dark:border-slate-700/50 text-slate-900 dark:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all w-full" 
              required 
              disabled={!uploadData.course} 
              value={uploadData.subject} 
              onChange={e => setUploadData({...uploadData, subject: e.target.value})}
            >
              <option value="" className="dark:bg-slate-900">{uploadData.course ? "Select Subject" : "Awaiting Domain Select..."}</option>
              {uploadSubjects.map(sub => (
                <option key={sub} value={sub} className="dark:bg-slate-900">{sub}</option>
              ))}
            </select>
          </div>

          <select className="glass dark:bg-slate-800/40 p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none border-white/60 dark:border-slate-700/50 text-slate-900 dark:text-white cursor-pointer transition-all" required value={uploadData.semester} onChange={e => setUploadData({...uploadData, semester: e.target.value})}>
             <option value="" className="dark:bg-slate-900">Select Semester</option>
             {SEMESTERS.map(sem => (
               <option key={sem} value={sem} className="dark:bg-slate-900">Semester {sem}</option>
             ))}
          </select>

          <select className="glass dark:bg-slate-800/40 p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none border-white/60 dark:border-slate-700/50 text-slate-900 dark:text-white cursor-pointer transition-all" required value={uploadData.category} onChange={e => setUploadData({...uploadData, category: e.target.value})}>
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id} className="dark:bg-slate-900">{cat.name}</option>
            ))}
          </select>

           <input type="file" required accept=".pdf" className="glass dark:bg-slate-800/40 p-5 rounded-2xl text-xs font-black file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-all border-white/60 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 cursor-pointer" onChange={e => setFile(e.target.files[0])} />
          
          <button type="submit" disabled={uploading || !file} className="premium-gradient font-black p-5 rounded-2xl hover:shadow-indigo-200 dark:shadow-none disabled:opacity-50 transition-all shadow-xl active:scale-[0.98] lg:col-span-3 flex items-center justify-center gap-3">
             <UploadIcon className="w-5 h-5" />
             {uploading ? 'Processing Data Streams...' : 'Execute Submission'}
          </button>
        </form>
      </div>

      {/* Tracker Section */}
      <div className="glass-card dark:bg-slate-900/50 shadow-2xl border-0 p-10 relative overflow-hidden transition-colors">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-10 transition-colors">Data Submission Ledger</h2>
        
        {contributions.length === 0 ? (
          <div className="p-10 glass dark:bg-slate-900/30 rounded-[2.5rem] border-0 mt-4">
            <EmptyState
              icon={FileText}
              title="No Active Submissions"
              description="Start building the collective knowledge base by sharing your study materials today."
            />
          </div>
        ) : contributions.length === 1 && contributions[0] === 'polling_skeleton' ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonTableRow key={i} columns={4} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden glass dark:bg-slate-900/30 border-white/60 dark:border-slate-800/50 rounded-[2rem] shadow-xl">
            <table className="min-w-full divide-y divide-white/20 dark:divide-slate-800/50">
              <thead className="bg-slate-900/5 dark:bg-slate-950/20">
                <tr>
                  <th className="py-6 pl-8 pr-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Document Horizon</th>
                  <th className="px-4 py-6 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Current Status</th>
                  <th className="px-4 py-6 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Insight Metrics</th>
                  <th className="px-4 py-6 text-right pr-8 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20 dark:divide-slate-800/50">
                {contributions.map((m) => {
                  const s = statuses[m.id] || {};
                  const pStatus = s.processing_status || m.processing_status;
                  const config = STATUS_CONFIG[pStatus] || { label: 'Initializing...', color: 'bg-slate-300', progress: 5 };
                  const recommendation = s.final_recommendation || m.final_recommendation;
                  const feedback = s.student_feedback_message || m.student_feedback_message;
                  const isTerminal = TERMINAL_STATES.includes(pStatus);

                  return (
                    <tr key={m.id} className="hover:bg-white/40 dark:hover:bg-slate-900/70 transition-all group">
                      <td className="py-6 pl-8 pr-4">
                        <span className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight block transition-colors">{m.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">ID: {m.id.substring(0,8)}</span>
                          <span className="text-slate-300 dark:text-slate-800">•</span>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">{new Date(m.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6 whitespace-nowrap">{getStatusBadge(m.status, pStatus)}</td>
                      <td className="px-4 py-6">
                        <div className="flex flex-col gap-3 p-5 glass dark:bg-slate-800/40 rounded-2xl border-0 shadow-inner w-80">
                          {/* Step & Progress */}
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">
                              {isTerminal ? 'Resolution' : 'Current Step'}
                            </span>
                            {!isTerminal && <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 animate-pulse uppercase tracking-widest">Processing</span>}
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${config.color} ${!isTerminal ? 'animate-ping' : ''}`}></div>
                             <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight transition-colors">{config.label}</span>
                          </div>
 
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${isTerminal ? 'bg-emerald-500' : 'premium-gradient'}`} style={{ width: `${config.progress}%` }}></div>
                          </div>

                           {/* Feedback / Recommendation */}
                          {(recommendation || feedback) && (
                            <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                              {recommendation && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-300 px-2 py-0.5 rounded uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                                    {recommendation.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              )}
                              {feedback && (
                                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-tight transition-colors">
                                  "{feedback}"
                                </p>
                              )}
                            </div>
                          )}

                          {/* Secondary Legacy Info */}
                          {!isTerminal && m.ai_grammar_score && (
                            <div className="mt-2 pt-2 flex justify-between items-center opacity-40">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Legacy AI Score: {m.ai_grammar_score}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-6 text-right pr-8">
                        {pStatus === 'processing_failed' && (
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleReprocess(m.id)}
                              disabled={actionLoading[m.id]}
                              title="Reprocess Pipeline"
                              className="p-3 rounded-xl glass dark:bg-slate-800/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:shadow-lg hover:shadow-indigo-500/10 transition-all disabled:opacity-50"
                            >
                              <RotateCw className={`w-4 h-4 ${actionLoading[m.id] === 'reprocess' ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              disabled={actionLoading[m.id]}
                              title="Delete Failed Record"
                              className="p-3 rounded-xl glass dark:bg-slate-800/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:shadow-lg hover:shadow-rose-500/10 transition-all disabled:opacity-50"
                            >
                              <Trash2 className={`w-4 h-4 ${actionLoading[m.id] === 'delete' ? 'animate-pulse' : ''}`} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
