import { useEffect, useState } from 'react';
import api from '../services/api';
import { UploadIcon, Activity, CheckCircle2, XCircle, Clock, FileText, Info, RotateCw, Trash2 } from 'lucide-react';
import { ACADEMIC_DATA, CATEGORIES, SEMESTERS } from '../constants/academicData';
import { useNotification } from '../context/NotificationContext';

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
    }
  };

  useEffect(() => {
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
    <div className="max-w-6xl mx-auto space-y-16 pb-24 animate-in fade-in duration-700">
      
      {/* Upload Section */}
      <div className="hybrid-card p-12 mt-10 relative overflow-hidden border border-white/10 dark:border-slate-800 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)]"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-14">
          <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-6 uppercase">
              <div className="p-5 bg-indigo-600 text-white rounded-[1.75rem] shadow-2xl shadow-indigo-600/20">
                <UploadIcon className="w-8 h-8"/>
              </div>
              Knowledge Injection
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.4em] mt-5 ml-1 leading-relaxed">
              Synthesize your materials into the platform index via high-fidelity AI vetting.
            </p>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-indigo-600/5 border border-indigo-600/10 rounded-2xl">
             <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
             <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Quality Check Active</span>
          </div>
        </div>
        
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Research Title</label>
            <input type="text" placeholder="Strategic Identifier" required className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all" value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} />
          </div>
          
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Knowledge Domain</label>
            <select className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-black text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all" required value={uploadData.course} onChange={e => setUploadData({...uploadData, course: e.target.value, subject: ''})}>
              <option value="">Select Domain</option>
              {Object.keys(ACADEMIC_DATA).map(course => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Subject Matter</label>
            <select 
              className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-black text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all disabled:opacity-40" 
              required 
              disabled={!uploadData.course} 
              value={uploadData.subject} 
              onChange={e => setUploadData({...uploadData, subject: e.target.value})}
            >
              <option value="">{uploadData.course ? "Select Subject" : "Await Domain..."}</option>
              {uploadSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Timeline</label>
            <select className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-black text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all" required value={uploadData.semester} onChange={e => setUploadData({...uploadData, semester: e.target.value})}>
               <option value="">Select Semester</option>
               {SEMESTERS.map(sem => (
                 <option key={sem} value={sem}>Semester {sem}</option>
               ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Classification</label>
            <select className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-black text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all" required value={uploadData.category} onChange={e => setUploadData({...uploadData, category: e.target.value})}>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Source Material (.PDF)</label>
            <div className="relative group/file">
              <input type="file" required accept=".pdf" className="w-full px-6 py-[1.1rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer file:hidden transition-all" onChange={e => setFile(e.target.files[0])} />
              <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none text-indigo-600 group-hover/file:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700">
                {file ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <FileText className="w-4 h-4" />}
                <span className="ml-3 truncate max-w-[120px]">{file ? file.name : "Choose File"}</span>
              </div>
            </div>
          </div>
          
          <button type="submit" disabled={uploading || !file} className="w-full lg:col-span-3 mt-4 py-6 px-8 bg-indigo-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4">
             {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UploadIcon className="w-5 h-5" />}
             {uploading ? 'Processing Data Streams...' : 'Execute Submission'}
          </button>
        </form>
      </div>

      {/* Tracker Section */}
      <div className="hybrid-card p-12 relative overflow-hidden border border-white/10 dark:border-slate-800 shadow-2xl transition-all">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-14 uppercase">Knowledge Ledger</h2>
        
        {contributions.length === 0 ? (
          <div className="text-center py-32 bg-slate-50 dark:bg-slate-950/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
            <div className="bg-white dark:bg-slate-900 w-24 h-24 rounded-[2rem] mx-auto flex items-center justify-center mb-8 shadow-xl">
               <FileText className="w-12 h-12 text-slate-200 dark:text-slate-800" />
            </div>
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">No Active Records</h3>
            <p className="text-[11px] text-slate-300 dark:text-slate-700 font-black uppercase tracking-widest mt-3">Platform registry is currently empty</p>
          </div>
        ) : (
          <div className="overflow-hidden bg-white dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50 rounded-[2.5rem] shadow-2xl">
            <table className="min-w-full divide-y divide-slate-50 dark:divide-slate-800/50">
              <thead className="bg-slate-50 dark:bg-slate-950/20">
                <tr>
                  <th className="py-7 pl-10 pr-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Asset Horizon</th>
                  <th className="px-4 py-7 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">State</th>
                  <th className="px-4 py-7 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Insight Metrics</th>
                  <th className="px-4 py-7 text-right pr-10 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {contributions.map((m) => {
                  const s = statuses[m.id] || {};
                  const pStatus = s.processing_status || m.processing_status;
                  const config = STATUS_CONFIG[pStatus] || { label: 'Initializing...', color: 'bg-slate-300', progress: 5 };
                  const recommendation = s.final_recommendation || m.final_recommendation;
                  const feedback = s.student_feedback_message || m.student_feedback_message;
                  const isTerminal = TERMINAL_STATES.includes(pStatus);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all group">
                      <td className="py-8 pl-10 pr-4">
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight block group-hover:text-indigo-600 transition-colors">{m.title}</span>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">ID: {m.id.substring(0,8)}</span>
                          <span className="text-slate-200 dark:text-slate-800">•</span>
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{new Date(m.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-8 whitespace-nowrap">{getStatusBadge(m.status, pStatus)}</td>
                      <td className="px-4 py-8">
                        <div className="flex flex-col gap-4 p-6 bg-slate-50/50 dark:bg-slate-950/50 rounded-[1.75rem] border border-slate-100 dark:border-slate-800/50 shadow-sm min-w-[320px]">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">
                              {isTerminal ? 'System Resolution' : 'Pipeline Progress'}
                            </span>
                            {!isTerminal && (
                              <div className="flex gap-1">
                                <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                <div className="w-1 h-1 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                             <div className={`w-2.5 h-2.5 rounded-full ${config.color} ${!isTerminal ? 'animate-pulse' : ''}`}></div>
                             <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{config.label}</span>
                          </div>
 
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${isTerminal ? 'bg-emerald-500' : 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]'}`} style={{ width: `${config.progress}%` }}></div>
                          </div>

                          {(recommendation || feedback) && (
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-900/50 space-y-3">
                              {recommendation && (
                                <span className="inline-block text-[9px] font-black bg-indigo-600 text-white px-3 py-1 rounded-lg uppercase tracking-widest">
                                  {recommendation.replace(/_/g, ' ')}
                                </span>
                              )}
                              {feedback && (
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic leading-relaxed">
                                  "{feedback}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-8 text-right pr-10">
                        {pStatus === 'processing_failed' && (
                          <div className="flex items-center justify-end gap-4">
                            <button
                              onClick={() => handleReprocess(m.id)}
                              disabled={actionLoading[m.id]}
                              title="Restart Pipeline"
                              className="p-3 bg-indigo-600/10 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all interactive-scale"
                            >
                              <RotateCw className={`w-4 h-4 ${actionLoading[m.id] === 'reprocess' ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              disabled={actionLoading[m.id]}
                              title="Purge Record"
                              className="p-3 bg-rose-600/10 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all interactive-scale"
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

