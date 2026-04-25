import { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  ShieldAlert, 
  CheckCircle2, 
  FileWarning, 
  Database, 
  Activity, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  ArrowRight,
  Search,
  FileCheck,
  Zap,
  TrendingDown,
  Hammer
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { Skeleton, SkeletonCard, SkeletonTitle, SkeletonText } from '../components/common/Skeleton';
import { useNavigate } from 'react-router-dom';

export default function AdminFileHealth() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryingIds, setRetryingIds] = useState(new Set());
  const { success, error: toastError, info } = useNotification();
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/material-health');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch health stats:', err);
      toastError("Failed to load library health analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRedoPipeline = async (materialId) => {
    try {
      setRetryingIds(prev => new Set(prev).add(materialId));
      await api.post(`/materials/${materialId}/redo-pipeline`);
      success("Pipeline recovery triggered successfully.");
      // Soft refresh of stats after a short delay
      setTimeout(fetchStats, 1500);
    } catch (err) {
      console.error('Redo pipeline failed:', err);
      toastError("Failed to trigger pipeline recovery.");
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(materialId);
        return next;
      });
    }
  };

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Skeleton width="200px" height="2.5rem" />
            <Skeleton width="300px" height="1rem" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const healthScore = stats ? Math.round((stats.healthy / stats.total) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6 pb-24">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tighter">
            <div className="p-3 premium-gradient rounded-2xl shadow-lg ring-4 ring-indigo-50 dark:ring-indigo-900/20">
              <Activity className="text-white w-7 h-7" />
            </div>
            Library Health Analytics
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm ml-1">Operational diagnostics and automated recovery for the AI Knowledge Base.</p>
        </div>
        <button 
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800 glass border-0 rounded-2xl text-sm font-black text-slate-600 dark:text-slate-300 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Force Re-scan
        </button>
      </div>

      {/* ── KPI Dashboard ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Materials */}
        <div className="glass-card p-6 border-0 shadow-xl overflow-hidden relative group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full opacity-50 group-hover:scale-110 transition-transform" />
           <div className="flex flex-col relative z-10">
              <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Library Size</span>
              <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.total}</span>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                 <Database className="w-3.5 h-3.5" />
                 <span>Total Approved Assets</span>
              </div>
           </div>
        </div>

        {/* Health Score */}
        <div className="glass-card p-6 border-0 shadow-xl overflow-hidden relative group">
           <div className={`absolute -right-4 -top-4 w-24 h-24 ${healthScore > 90 ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-amber-100 dark:bg-amber-950/30'} rounded-full opacity-50 group-hover:scale-110 transition-transform`} />
           <div className="flex flex-col relative z-10">
              <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Integrity Score</span>
              <span className={`text-4xl font-black tracking-tighter ${healthScore > 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>{healthScore}%</span>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                 <ShieldAlert className="w-3.5 h-3.5" />
                 <span>{stats.healthy} of {stats.total} Healthy</span>
              </div>
           </div>
        </div>

        {/* Missing Files */}
        <div className="glass-card p-6 border-0 shadow-xl overflow-hidden relative group">
           <div className={`absolute -right-4 -top-4 w-24 h-24 ${stats.missing > 0 ? 'bg-red-100 dark:bg-red-950/30' : 'bg-slate-100 dark:bg-slate-800'} rounded-full opacity-50 group-hover:scale-110 transition-transform`} />
           <div className="flex flex-col relative z-10">
              <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Storage Gaps</span>
              <span className={`text-4xl font-black tracking-tighter ${stats.missing > 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{stats.missing}</span>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                 <FileWarning className="w-3.5 h-3.5" />
                 <span>Physical files missing from S3/Local</span>
              </div>
           </div>
        </div>

        {/* Pipeline Failures */}
        <div className="glass-card p-6 border-0 shadow-xl overflow-hidden relative group">
           <div className={`absolute -right-4 -top-4 w-24 h-24 ${stats.processing_failed > 0 ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-slate-100 dark:bg-slate-800'} rounded-full opacity-50 group-hover:scale-110 transition-transform`} />
           <div className="flex flex-col relative z-10">
              <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Pipeline Errors</span>
              <span className={`text-4xl font-black tracking-tighter ${stats.processing_failed > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>{stats.processing_failed}</span>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                 <Zap className="w-3.5 h-3.5" />
                 <span>Indexing & Extraction Failures</span>
              </div>
           </div>
        </div>
      </div>

      {/* ── Issue Distribution ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Priority Repair Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
              <Hammer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Priority Repair Queue
            </h2>
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Recent Issues Detected</span>
          </div>

          <div className="space-y-4">
            {stats.recent_issues.length === 0 ? (
              <div className="glass-card p-12 text-center border-0 shadow-xl italic text-slate-400 dark:text-slate-500 font-bold">
                 No integrity issues detected. The Knowledge Base is currently operational.
              </div>
            ) : (
              stats.recent_issues.map((item) => (
                <div key={item.id} className="glass-card p-6 border-0 shadow-xl hover:shadow-2xl transition-all group overflow-hidden relative">
                   <div className={`absolute top-0 left-0 w-1.5 h-full ${
                     item.integrity_status === 'missing_file' ? 'bg-red-500' : 
                     item.integrity_status === 'corrupted_file' ? 'bg-rose-500' : 'bg-amber-500'
                   }`} />
                   
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                         <div className={`p-4 rounded-2xl shrink-0 ${
                           item.integrity_status === 'missing_file' ? 'bg-red-50 dark:bg-red-900/10 text-red-500' : 
                           item.integrity_status === 'corrupted_file' ? 'bg-rose-50 dark:bg-rose-900/10 text-rose-500' : 
                           'bg-amber-50 dark:bg-amber-900/10 text-amber-500'
                         }`}>
                            {item.integrity_status === 'missing_file' ? <FileWarning className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                         </div>
                         <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                               <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[300px]">{item.title}</h3>
                               <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter ${
                                  item.integrity_status === 'missing_file' ? 'bg-red-500/10 text-red-500 border-red-200 dark:border-red-900/30' : 
                                  'bg-amber-500/10 text-amber-500 border-amber-200 dark:border-amber-900/30'
                               }`}>
                                  {item.integrity_status.replace('_', ' ')}
                               </span>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mb-3 italic">Reason: {item.integrity_message}</p>
                            
                            {item.repair_suggestion && (
                              <div className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                 <CheckCircle2 className="w-3.5 h-3.5" />
                                 <span>Recommended Action: {item.repair_suggestion}</span>
                              </div>
                            )}
                         </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-center gap-3 shrink-0">
                         {['processing_failed', 'indexing_failed'].includes(item.integrity_status) ? (
                           <button 
                            onClick={() => handleRedoPipeline(item.id)}
                            disabled={retryingIds.has(item.id)}
                            className="flex items-center gap-3 px-6 py-3.5 premium-gradient text-white text-xs font-black rounded-[2rem] shadow-xl hover:shadow-indigo-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                           >
                            <RefreshCw className={`w-4 h-4 ${retryingIds.has(item.id) ? 'animate-spin' : ''}`} />
                            {retryingIds.has(item.id) ? 'Retrying...' : 'Redo Pipeline'}
                           </button>
                         ) : (
                           <button 
                            onClick={() => navigate(`/materials?id=${item.id}`)}
                            className="flex items-center gap-3 px-6 py-3.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-black rounded-[2rem] hover:bg-slate-800 transition-all"
                           >
                             Manage Asset
                             <ArrowRight className="w-3 h-3" />
                           </button>
                         )}
                      </div>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Distribution & Alerts */}
        <div className="space-y-6">
           <div className="px-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Status Breakdown
            </h2>
          </div>

          <div className="glass-card p-6 border-0 shadow-xl space-y-5">
             {Object.entries(stats.status_distribution).map(([status, count]) => (
               <div key={status} className="space-y-2">
                  <div className="flex justify-between text-xs font-black">
                     <span className="text-slate-500 uppercase tracking-widest">{status.replace('_', ' ')}</span>
                     <span className="text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                     <div 
                      className={`h-full transition-all duration-1000 ${
                        status === 'available' ? 'bg-emerald-500' : 
                        status === 'missing_file' ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${(count / stats.total) * 100}%` }}
                     />
                  </div>
               </div>
             ))}
          </div>

          {/* Critical Alerts Card */}
          {stats.missing > 0 && (
            <div className="glass-card p-6 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 shadow-xl">
               <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-2">
                  <ShieldAlert className="w-5 h-5" />
                  <span className="text-sm font-black uppercase tracking-widest">Critical Alert</span>
               </div>
               <p className="text-xs font-bold text-red-500 dark:text-red-400/80 leading-relaxed">
                 {stats.missing} document(s) in the library have dead file references. Users will see "Material Missing" until re-uploaded or purged.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
