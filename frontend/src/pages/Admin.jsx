import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  ShieldAlert, Check, X, FileSearch, Info, AlertTriangle, 
  CheckCircle, Fingerprint, Gauge, Clock, Search, ChevronDown, ListCheck
} from 'lucide-react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('review');
  const [pending, setPending] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [activeReportId, setActiveReportId] = useState(null);

  const fetchPending = () => {
    api.get('/contributions/pending')
      .then(res => setPending(res.data.items || []))
      .catch(console.error);
  };

  useEffect(() => {
    if (activeTab === 'review') fetchPending();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  const fetchLogs = () => {
    api.get('/admin/logs').then(res => setLogs(res.data.logs || [])).catch(console.error);
  };

  const handleReview = async (id, isApproved) => {
    setLoading(true);
    try {
      await api.patch(`/admin/contributions/${id}/review`, { approved: isApproved, admin_notes: "Reviewed" });
      alert(isApproved ? "Approved! Document has been published to the global library." : "Rejected successfully.");
      setShowReport(false);
      fetchPending();
    } catch (err) {
      alert("Error processing review: " + (err.response?.data?.detail || ""));
    } finally {
      setLoading(false);
    }
  };

  const openReport = async (item) => {
    if (!item || !item.id) {
      console.error("ADMIN_REPORT_UI: Attempted to open report with a missing contribution ID.", item);
      return;
    }

    console.log(`ADMIN_REPORT_UI: Requesting technical report for ID: ${item.id}`);
    setActiveReportId(item.id);
    setLoading(true);
    setReportData(null); // Clear stale report data before fetch

    try {
      const res = await api.get(`/admin/contributions/${item.id}/report`);
      console.log("ADMIN_REPORT_UI: Successfully received report payload", res.data);
      setReportData(res.data);
      setShowReport(true);
    } catch (err) {
      console.error("ADMIN_REPORT_UI: Fetch operation failed", err);
      const errorDetail = err.response?.data?.detail || "Failed to load technical report due to a network or server error.";
      alert(errorDetail);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLabel = (score) => {
    if (score === null || score === undefined) return { label: 'N/A', color: 'text-slate-400' };
    if (score < 0.3) return { label: 'LOW', color: 'text-emerald-600' };
    if (score < 0.7) return { label: 'MEDIUM', color: 'text-amber-600' };
    return { label: 'HIGH', color: 'text-red-600' };
  };

  const getQualityLabel = (score) => {
    if (score === null || score === undefined) return { label: 'N/A', color: 'text-slate-400' };
    if (score > 0.8) return { label: 'EXCELLENT', color: 'text-emerald-600' };
    if (score > 0.5) return { label: 'GOOD', color: 'text-blue-600' };
    return { label: 'POOR', color: 'text-red-600' };
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="hybrid-card p-10 md:p-14 border border-slate-200 dark:border-slate-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] relative overflow-hidden">
         <div className="absolute top-0 left-0 w-2 h-full bg-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.3)]"></div>
         
         <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-8">
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-5 tracking-tight uppercase">
                <div className="p-3 bg-rose-600 text-white rounded-[1.25rem] shadow-xl shadow-rose-600/20">
                  <ShieldAlert className="w-8 h-8"/>
                </div>
                Command Console
              </h2>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-3 font-bold uppercase tracking-[0.2em] max-w-xl">Executive Audit Interface // Material Synchronization & System Integrity Monitoring</p>
            </div>
            
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
              <button onClick={() => setActiveTab('review')} className={`px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'review' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xl border border-slate-100 dark:border-slate-700' : 'text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-200'}`}>Review Queue</button>
              <button onClick={() => setActiveTab('logs')} className={`px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xl border border-slate-100 dark:border-slate-700' : 'text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-200'}`}>Audit Logs</button>
            </div>
         </div>

        {activeTab === 'review' && (
          pending.length === 0 ? (
            <div className="text-center py-24 text-slate-400 dark:text-slate-600 font-black bg-slate-50/50 dark:bg-slate-950/20 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 uppercase tracking-[0.3em] text-sm shadow-inner">No Pending Synchronization Requests</div>
          ) : (
            <>
              {/* Tablet/Desktop Table View */}
              <div className="hidden md:block overflow-hidden saas-card rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/20 transition-all">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/50">
                  <thead className="bg-slate-50/50 dark:bg-slate-900/40">
                    <tr>
                      <th className="py-6 pl-8 pr-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Source Identity</th>
                      <th className="px-4 py-6 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Classification</th>
                      <th className="px-4 py-6 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">FAISS Scan</th>
                      <th className="px-4 py-6 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Syntax Merit</th>
                      <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] min-w-[200px]">Execution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {pending.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all group">
                        <td className="whitespace-nowrap py-6 pl-8 pr-4 text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{m.title}</td>
                        <td className="whitespace-nowrap px-4 py-6 text-[11px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{m.category} // S-{m.semester}</td>
                        <td className="whitespace-nowrap px-4 py-6 text-sm">
                           {m.ai_plagiarism_score !== null ? (
                              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest ${m.ai_plagiarism_score > 50 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'}`}>
                                 {m.ai_plagiarism_score}% Overlay
                              </span>
                           ) : <span className="text-slate-300 dark:text-slate-700 font-black text-[9px] uppercase tracking-[0.2em] animate-pulse">Scanning Core...</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-6 text-sm">
                            {m.ai_grammar_score !== null ? (
                              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest ${m.ai_grammar_score < 50 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'}`}>
                                 {m.ai_grammar_score} Merit Points
                              </span>
                           ) : <span className="text-slate-300 dark:text-slate-700 font-black text-[9px] uppercase tracking-[0.2em] animate-pulse">Processing...</span>}
                        </td>
                        <td className="whitespace-nowrap px-8 py-6 text-right">
                          <div className="flex justify-end gap-3 items-center">
                            <button 
                              onClick={() => openReport(m)}
                              className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all shadow-sm interactive-scale"
                              title="Forensic Report"
                            >
                              <FileSearch className="w-5 h-5"/>
                            </button>
                            <button 
                              disabled={loading}
                              onClick={() => handleReview(m.id, true)} 
                              className="p-3 bg-emerald-600 text-white rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20 interactive-scale" 
                              title="Commit to Vault"
                            >
                              <Check className="w-5 h-5"/>
                            </button>
                            <button 
                              disabled={loading}
                              onClick={() => handleReview(m.id, false)} 
                              className="p-3 bg-rose-600 text-white rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-rose-600/20 interactive-scale" 
                              title="Purge Fragment"
                            >
                              <X className="w-5 h-5"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        )}

        {activeTab === 'logs' && (
          <div className="overflow-hidden saas-card rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/20 transition-all">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/50">
              <thead className="bg-slate-50/50 dark:bg-slate-900/40">
                <tr>
                  <th className="py-6 pl-8 pr-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="px-4 py-6 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Protocol</th>
                  <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Action Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                    <td className="whitespace-nowrap py-6 pl-8 pr-4 text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-tighter">
                       {new Date(log.timestamp).toLocaleDateString()} // {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{log.action}</td>
                    <td className="px-8 py-6 text-sm text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <div className="text-center py-16 text-slate-300 dark:text-slate-700 font-black text-xs uppercase tracking-[0.3em]">No Audit Activity Detected</div>}
          </div>
        )}
      </div>

      {/* Technical Report Modal */}
      {showReport && reportData && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/10 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
            
            {/* Header */}
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40 relative z-10">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-2xl shadow-indigo-600/20">
                  <Fingerprint className="w-8 h-8"/>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-2">Technical Validation</h2>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Node Diagnostic • {activeReportId.slice(0,12)}</p>
                </div>
              </div>
              <button onClick={() => setShowReport(false)} className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all hover:text-rose-600 interactive-scale">
                <X className="w-6 h-6"/>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-12 space-y-16 custom-scrollbar relative z-10">
              
              {/* 1. Final Decision Summary */}
              <section className="bg-slate-900 dark:bg-black rounded-[2.5rem] p-10 border border-slate-800 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-indigo-600/5 pointer-events-none"></div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                  <ListCheck className="w-5 h-5 text-indigo-500"/> Executive Summary Analysis
                </h3>
                <div className="grid md:grid-cols-3 gap-12 relative z-10">
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Current Recommendation</p>
                    <span className={`inline-flex py-2 px-6 rounded-xl text-[10px] font-black border uppercase tracking-widest ${
                      reportData?.summary?.recommendation === 'APPROVED_FOR_REVIEW' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                      reportData?.summary?.recommendation === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {reportData?.summary?.recommendation?.replace(/_/g, ' ') || 'PENDING CLASSIFICATION'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Overall Merit</p>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-black text-white leading-none">{(reportData?.summary?.overall_quality_score * 100 || 0).toFixed(0)}<span className="text-lg text-slate-600 ml-1">%</span></span>
                      <div className="h-10 w-px bg-slate-800"></div>
                      <span className={`text-[10px] font-black ${getQualityLabel(reportData?.summary?.overall_quality_score).color} uppercase tracking-widest`}>
                        {getQualityLabel(reportData?.summary?.overall_quality_score).label}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Risk Coefficient</p>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-black text-white leading-none">{(reportData?.summary?.overall_risk_score * 100 || 0).toFixed(0)}<span className="text-lg text-slate-600 ml-1">%</span></span>
                      <div className="h-10 w-px bg-slate-800"></div>
                      <span className={`text-[10px] font-black ${getRiskLabel(reportData?.summary?.overall_risk_score).color} uppercase tracking-widest`}>
                        {getRiskLabel(reportData?.summary?.overall_risk_score).label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-10 pt-8 border-t border-slate-800/50">
                   <p className="text-sm font-bold text-slate-400 italic leading-relaxed">" {reportData?.summary?.admin_summary || 'No technical summary provided for this fragment.'} "</p>
                </div>
              </section>

              {/* 2. Analysis Grid */}
              <div className="grid md:grid-cols-2 gap-12">
                
                {/* Plagiarism & Similarity */}
                <div className="space-y-8">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[60px] rounded-full"></div>
                    <div className="flex justify-between items-start mb-8">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3"><Search className="w-5 h-5 text-indigo-500"/> Originality Scan</h4>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${getRiskLabel(1 - (reportData?.layers?.plagiarism?.score || 0)).color} bg-white dark:bg-slate-900`}>
                        {getRiskLabel(1 - (reportData?.layers?.plagiarism?.score || 0)).label} RISK
                      </span>
                    </div>
                    <div className="space-y-5">
                      <div className="flex justify-between items-center">
                         <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Overlap Magnitude</span>
                         <span className="text-base font-black text-slate-900 dark:text-white">{(reportData?.layers?.plagiarism?.score * 100 || 0).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Semantic Delta</span>
                         <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{reportData?.layers?.similarity?.details?.duplicate_risk_level || 'MINIMAL'}</span>
                      </div>
                      
                      {reportData?.layers?.plagiarism?.details?.matched_sources?.length > 0 && (
                        <div className="mt-6 p-6 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                          <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] mb-4">FAISS Proximity Matches</p>
                          <div className="space-y-3">
                            {reportData?.layers?.plagiarism?.details?.matched_sources?.slice(0, 3).map((s, idx) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[70%]">• {s.title || 'Knowledge Fragment'}</span>
                                <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">{(s.score * 100 || 0).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/40 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3"><ShieldAlert className="w-5 h-5 text-rose-500"/> Core Safety</h4>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${reportData?.layers?.toxicity?.score < 1 ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 border-rose-500/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/20'}`}>
                        {reportData?.layers?.toxicity?.score < 1 ? 'VIOLATION' : 'PASSED'}
                      </span>
                    </div>
                    <div className="space-y-4">
                       <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-tight">{reportData?.layers?.toxicity?.details?.summary_feedback || 'Safety scan negative for malicious patterns.'}</p>
                       {reportData?.layers?.toxicity?.details?.categories_triggered?.length > 0 && (
                         <div className="flex flex-wrap gap-2 pt-2">
                           {reportData?.layers?.toxicity?.details?.categories_triggered.map(c => (
                             <span key={c} className="bg-rose-600 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-rose-600/20">{c.replace(/_/g, ' ')}</span>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-8">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3"><Gauge className="w-5 h-5 text-indigo-500"/> Linguistic Integrity</h4>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-lg border uppercase tracking-widest ${getQualityLabel(reportData?.layers?.grammar?.score).color} bg-white dark:bg-slate-900`}>
                        {getQualityLabel(reportData?.layers?.grammar?.score).label}
                      </span>
                    </div>
                    <div className="space-y-6">
                       <div className="flex justify-between items-end">
                         <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Complexity Index</p>
                            <span className="text-2xl font-black text-slate-900 dark:text-white">{reportData?.layers?.grammar?.details?.readability_score || '0.0'}</span>
                         </div>
                         <div className="text-right">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Score Matrix</p>
                            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{(reportData?.layers?.grammar?.score * 100 || 0).toFixed(0)}</span>
                         </div>
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed italic border-l-2 border-indigo-500 pl-4">{reportData?.layers?.grammar?.details?.summary_feedback || 'Syntax analysis stable.'}</p>
                    </div>
                  </div>

                  {/* AI Detection Component */}
                  <div className="bg-indigo-600 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-600/40 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-full h-full bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <h4 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3"><Fingerprint className="w-5 h-5"/> AI Signal Probability</h4>
                      <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest px-3 py-1 bg-white/10 rounded-lg">Heuristic Engine</span>
                    </div>
                    <div className="flex items-end justify-between relative z-10">
                      <div className="space-y-2">
                        <span className="text-5xl font-black text-white leading-none">{(reportData?.layers?.ai_generated?.probability * 100 || 0).toFixed(0)}%</span>
                        <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">{reportData?.layers?.ai_generated?.details?.confidence_level || 'LOW'} Confidence Projection</p>
                      </div>
                      <div className="w-24 text-right">
                         <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mb-3">
                           <div className="bg-white h-full" style={{ width: `${(reportData?.layers?.ai_generated?.probability || 0) * 100}%` }}></div>
                         </div>
                         <span className="text-[8px] font-black text-indigo-200 uppercase tracking-[0.2em]">Forensic Signal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Timeline Audit */}
              <section className="pt-12 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-12 justify-center">
                   <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                        <Clock className="w-4 h-4 text-slate-400 dark:text-slate-600"/>
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingested</p>
                      <p className="text-[11px] font-black text-slate-900 dark:text-white">{reportData?.timeline?.uploaded_at ? new Date(reportData.timeline.uploaded_at).toLocaleTimeString() : '--:--'}</p>
                   </div>
                   <div className="w-16 h-0.5 bg-slate-100 dark:bg-slate-800"></div>
                   <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
                        <Gauge className="w-4 h-4 text-indigo-600 dark:text-indigo-400"/>
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Processed</p>
                      <p className="text-[11px] font-black text-slate-900 dark:text-white">{reportData?.timeline?.processing_started_at ? new Date(reportData.timeline.processing_started_at).toLocaleTimeString() : '--:--'}</p>
                   </div>
                   <div className="w-16 h-0.5 bg-slate-100 dark:bg-slate-800"></div>
                   <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/>
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Validated</p>
                      <p className="text-[11px] font-black text-slate-900 dark:text-white">{reportData?.timeline?.processing_completed_at ? new Date(reportData.timeline.processing_completed_at).toLocaleTimeString() : '--:--'}</p>
                   </div>
                </div>
              </section>

            </div>

            {/* Footer Actions */}
            <div className="p-10 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
               <div className="flex items-center gap-5 max-w-lg">
                  <div className="p-2 bg-indigo-500/10 rounded-xl">
                    <Info className="w-6 h-6 text-indigo-600 dark:text-indigo-400"/>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">System Advisor Recommendation: Perform a secondary manual audit if AI Signal Probability exceeds 75% magnitude.</p>
               </div>
               <div className="flex gap-4 w-full md:w-auto">
                 <button 
                   disabled={loading}
                   onClick={() => handleReview(activeReportId, false)}
                   className="flex-1 md:flex-none px-10 py-4 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 rounded-2xl font-black text-xs uppercase tracking-widest transition-all interactive-scale"
                 >
                   Purge Fragment
                 </button>
                 <button 
                  disabled={loading}
                  onClick={() => handleReview(activeReportId, true)}
                  className="flex-1 md:flex-none px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] transition-all interactive-scale flex items-center justify-center gap-3"
                 >
                   <Check className="w-5 h-5"/> Commit & Publish
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
/div>
  );
}
