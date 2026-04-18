import { useEffect, useState } from 'react';
import api from '../services/api';
import { UploadIcon, Activity, CheckCircle2, XCircle, Clock, FileText, Info } from 'lucide-react';
import { ACADEMIC_DATA, CATEGORIES, SEMESTERS } from '../constants/academicData';

export default function Contributions() {
  const [contributions, setContributions] = useState([]);
  
  // Upload State
  const [file, setFile] = useState(null);
  const [uploadData, setUploadData] = useState({ title: '', description: '', course: '', subject: '', category: 'NOTES', semester: 1 });
  const [uploading, setUploading] = useState(false);

  // Status Tracking & Polling
  const [statuses, setStatuses] = useState({}); // keyed by id
  const [isPolling, setIsPolling] = useState(false);

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
    if (!file) return alert("Select a file first");
    
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
      alert("Contribution submitted successfully! Initializing processing pipeline...");
      setFile(null);
      // Trigger immediate refresh and start polling
      await fetchMine();
      setIsPolling(true);
    } catch (err) {
       alert(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
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
      
      {/* Upload Section */}
      <div className="glass-card shadow-2xl border-0 p-10 mt-6 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-2 h-full premium-gradient"></div>
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 tracking-tighter">
             <div className="p-3 premium-gradient rounded-2xl shadow-lg ring-4 ring-indigo-50">
               <UploadIcon className="text-white w-6 h-6"/>
             </div>
             Knowledge Submission
           </h2>
           <div className="hidden md:flex items-center gap-2 px-4 py-2 glass rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
             <Info className="w-3.5 h-3.5"/> Quality Check Active
           </div>
        </div>
        <p className="text-slate-500 text-base mt-2 mb-10 font-bold opacity-80 leading-relaxed max-w-2xl">
          Contribute to the collective intelligence. Your materials undergo high-fidelity AI quality vetting before platform indexing.
        </p>
        
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <input type="text" placeholder="Strategic Title (e.g. OS Module 1 Summary)" required className="glass p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none border-white/60" value={uploadData.title} onChange={e => setUploadData({...uploadData, title: e.target.value})} />
          
          <select className="glass p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none border-white/60 cursor-pointer" required value={uploadData.course} onChange={e => setUploadData({...uploadData, course: e.target.value, subject: ''})}>
            <option value="">Select Domain</option>
            {Object.keys(ACADEMIC_DATA).map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

          <div className="relative">
            <select 
              className="glass p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none border-white/60 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all w-full" 
              required 
              disabled={!uploadData.course} 
              value={uploadData.subject} 
              onChange={e => setUploadData({...uploadData, subject: e.target.value})}
            >
              <option value="">{uploadData.course ? "Select Subject" : "Awaiting Domain Select..."}</option>
              {uploadSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <select className="glass p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none border-white/60 cursor-pointer" required value={uploadData.semester} onChange={e => setUploadData({...uploadData, semester: e.target.value})}>
             <option value="">Select Semester</option>
             {SEMESTERS.map(sem => (
               <option key={sem} value={sem}>Semester {sem}</option>
             ))}
          </select>

          <select className="glass p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none border-white/60 cursor-pointer" required value={uploadData.category} onChange={e => setUploadData({...uploadData, category: e.target.value})}>
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <input type="file" required accept=".pdf" className="glass p-5 rounded-2xl text-xs font-black file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-all border-white/60 cursor-pointer" onChange={e => setFile(e.target.files[0])} />
          
          <button type="submit" disabled={uploading || !file} className="premium-gradient font-black p-5 rounded-2xl hover:shadow-indigo-200 disabled:opacity-50 transition-all shadow-xl active:scale-[0.98] lg:col-span-3 flex items-center justify-center gap-3">
             <UploadIcon className="w-5 h-5" />
             {uploading ? 'Processing Data Streams...' : 'Execute Submission'}
          </button>
        </form>
      </div>

      {/* Tracker Section */}
      <div className="glass-card shadow-2xl border-0 p-10 relative overflow-hidden">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-10">Data Submission Ledger</h2>
        
        {contributions.length === 0 ? (
          <div className="text-center py-24 glass rounded-[2.5rem] border-0">
            <div className="bg-slate-100 w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-inner">
               <FileText className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-[0.3em]">No Active Submissions</h3>
            <p className="text-slate-400 text-sm mt-2 font-semibold">Start building the knowledge base today.</p>
          </div>
        ) : (
          <div className="overflow-hidden glass border-white/60 rounded-[2rem] shadow-xl">
            <table className="min-w-full divide-y divide-white/20">
              <thead className="bg-slate-900/5">
                <tr>
                  <th className="py-6 pl-8 pr-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Document Horizon</th>
                  <th className="px-4 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Current Status</th>
                  <th className="px-4 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Insight Metrics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20">
                {contributions.map((m) => {
                  const s = statuses[m.id] || {};
                  const pStatus = s.processing_status || m.processing_status;
                  const config = STATUS_CONFIG[pStatus] || { label: 'Initializing...', color: 'bg-slate-300', progress: 5 };
                  const recommendation = s.final_recommendation || m.final_recommendation;
                  const feedback = s.student_feedback_message || m.student_feedback_message;
                  const isTerminal = TERMINAL_STATES.includes(pStatus);

                  return (
                    <tr key={m.id} className="hover:bg-white/40 transition-all group">
                      <td className="py-6 pl-8 pr-4">
                        <span className="text-base font-bold text-slate-900 uppercase tracking-tight block">{m.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {m.id.substring(0,8)}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(m.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6 whitespace-nowrap">{getStatusBadge(m.status, pStatus)}</td>
                      <td className="px-4 py-6">
                        <div className="flex flex-col gap-3 p-5 glass rounded-2xl border-0 shadow-inner w-80">
                          {/* Step & Progress */}
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {isTerminal ? 'Resolution' : 'Current Step'}
                            </span>
                            {!isTerminal && <span className="text-[10px] font-black text-indigo-600 animate-pulse uppercase tracking-widest">Processing</span>}
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${config.color} ${!isTerminal ? 'animate-ping' : ''}`}></div>
                             <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{config.label}</span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${isTerminal ? 'bg-emerald-500' : 'premium-gradient'}`} style={{ width: `${config.progress}%` }}></div>
                          </div>

                          {/* Feedback / Recommendation */}
                          {(recommendation || feedback) && (
                            <div className="mt-2 pt-3 border-t border-slate-100 flex flex-col gap-2">
                              {recommendation && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded uppercase tracking-widest border border-indigo-100">
                                    {recommendation.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              )}
                              {feedback && (
                                <p className="text-[11px] font-bold text-slate-500 leading-tight">
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

