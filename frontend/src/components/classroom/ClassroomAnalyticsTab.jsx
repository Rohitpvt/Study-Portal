import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, BookOpen, Layout, 
  MessageSquare, AlertCircle, TrendingUp, 
  CheckCircle2, Clock, Target, ArrowUpRight,
  ArrowDownRight, Sparkles, ChevronRight,
  Search, Filter, Download, Info
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const ClassroomAnalyticsTab = ({ classroomId }) => {
  const { error } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/classrooms/${classroomId}/analytics`);
      setData(res.data);
    } catch (err) {
      error("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [classroomId]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 glass dark:bg-white/2 rounded-[2rem]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[400px] glass dark:bg-white/2 rounded-[2rem]" />
          <div className="h-[400px] glass dark:bg-white/2 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
    <div className="glass dark:bg-white/2 rounded-[2rem] p-6 border border-white/5 relative overflow-hidden group hover:border-indigo-500/20 transition-all">
       <div className={`absolute -top-10 -right-10 w-32 h-32 ${color}/10 rounded-full blur-3xl group-hover:blur-2xl transition-all`} />
       <div className="relative z-10 flex items-start justify-between">
          <div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
             <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h3>
             {trend && (
               <div className={`flex items-center gap-1 mt-2 ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span className="text-[10px] font-black">{trendValue}</span>
               </div>
             )}
          </div>
          <div className={`p-4 rounded-2xl ${color}/10 text-${color.split('-')[1]}-500 shadow-lg`}>
             <Icon size={20} />
          </div>
       </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* AI Insight Bar */}
      <div className="glass dark:bg-indigo-500/5 rounded-[2rem] p-6 border border-indigo-500/20 flex flex-col md:flex-row items-center gap-6">
         <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 shrink-0">
            <Sparkles size={24} />
         </div>
         <div className="flex-1 text-center md:text-left">
            <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">Performance Insight</h4>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 italic leading-relaxed">
              "{data.ai_insight_summary}"
            </p>
         </div>
         <button className="px-6 py-3 glass dark:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-all border border-white/5 whitespace-nowrap">
            Detailed Analysis
         </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Students" 
          value={data.overview.total_students} 
          icon={Users} 
          color="bg-blue-500"
        />
        <StatCard 
          title="Avg Score" 
          value={data.performance.average_marks ? `${Math.round(data.performance.average_marks)}%` : "N/A"} 
          icon={Target} 
          color="bg-indigo-500"
          trend="up"
          trendValue="+4% vs last week"
        />
        <StatCard 
          title="Completion" 
          value={`${data.performance.completion_rate}%`} 
          icon={CheckCircle2} 
          color="bg-emerald-500"
        />
        <StatCard 
          title="Pending Doubts" 
          value={data.communication.open_private_doubts} 
          icon={MessageSquare} 
          color="bg-amber-500"
          trend="down"
          trendValue="-2 from yesterday"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Detailed Lists */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Assignment Performance */}
          <div className="glass dark:bg-white/2 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                     <Layout size={20} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Assignment Performance</h3>
               </div>
               <button className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                  View All <ChevronRight size={14} />
               </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.01]">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignment</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submissions</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Missing</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Score</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.assignment_breakdown.map((item) => (
                    <tr key={item.assignment_id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors">{item.title}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                            Due {item.due_at ? new Date(item.due_at).toLocaleDateString() : 'No Due'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300">{item.submission_count}</span>
                          {item.late_count > 0 && (
                            <span className="text-[9px] font-black text-rose-500 uppercase">({item.late_count} late)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-xs font-black ${item.missing_count > 5 ? 'text-rose-500' : 'text-slate-500'}`}>
                          {item.missing_count}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                           <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                             {item.average_marks ? `${Math.round(item.average_marks)}%` : '—'}
                           </span>
                           {item.average_marks && (
                             <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${item.average_marks < 50 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                  style={{ width: `${item.average_marks}%` }}
                                />
                             </div>
                           )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          item.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Attention */}
          <div className="glass dark:bg-white/2 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
             <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                      <AlertCircle size={20} />
                   </div>
                   <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Students Requiring Attention</h3>
                </div>
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                      <Filter size={12} className="text-slate-500" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Filter</span>
                   </div>
                </div>
             </div>
             <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.student_attention.filter(s => s.missing_count > 0 || (s.average_marks && s.average_marks < 60)).map((student) => (
                   <div key={student.student_id} className="p-5 glass dark:bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-between hover:border-rose-500/20 transition-all">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-black">
                            {student.name.charAt(0)}
                         </div>
                         <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">{student.name}</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{student.roll_no || 'No Roll No'}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                               <span className="text-xs font-black text-rose-500">{student.missing_count}</span>
                               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Missing</span>
                            </div>
                            <div className="w-px h-6 bg-white/5" />
                            <div className="flex flex-col items-center">
                               <span className="text-xs font-black text-amber-500">{student.late_count}</span>
                               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Late</span>
                            </div>
                         </div>
                      </div>
                   </div>
                ))}
                {data.student_attention.filter(s => s.missing_count > 0 || (s.average_marks && s.average_marks < 60)).length === 0 && (
                  <div className="col-span-full py-8 text-center opacity-40">
                     <p className="text-[10px] font-black uppercase tracking-widest">All students are on track!</p>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Right Column: Summaries */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Weak Topics */}
          <div className="glass dark:bg-white/2 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                   <TrendingUp size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Weak Areas</h3>
             </div>
             
             <div className="space-y-6">
                {data.weak_topics.length > 0 ? data.weak_topics.map((topic, i) => (
                   <div key={i} className="space-y-4">
                      <div className="flex items-start justify-between">
                         <div className="max-w-[70%]">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase mb-1">{topic.topic_title}</h4>
                            <p className="text-[10px] font-bold text-rose-500 leading-tight italic">{topic.reason}</p>
                         </div>
                         <span className="text-sm font-black text-rose-500">{Math.round(topic.average_score)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-rose-500 rounded-full" 
                           style={{ width: `${topic.average_score}%` }}
                         />
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="flex items-center gap-1">
                            <AlertCircle size={10} className="text-slate-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase">{topic.missing_count} Missing</span>
                         </div>
                         <div className="flex items-center gap-1">
                            <Clock size={10} className="text-slate-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase">{topic.late_count} Late</span>
                         </div>
                      </div>
                   </div>
                )) : (
                  <div className="py-8 text-center opacity-40">
                     <p className="text-[10px] font-black uppercase tracking-widest italic leading-relaxed">
                       Not enough data or all topics perform well.
                     </p>
                  </div>
                )}
             </div>
             
             {data.weak_topics.length > 0 && (
               <button className="w-full mt-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-500/20">
                  Generate Revision Plan
               </button>
             )}
          </div>

          {/* Communication Card */}
          <div className="glass dark:bg-white/2 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <MessageSquare size={120} />
             </div>
             <div className="relative z-10">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8">Interaction Activity</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 glass dark:bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Private Doubts</span>
                      <div className="flex items-baseline gap-2">
                         <span className="text-2xl font-black text-slate-900 dark:text-white">{data.communication.private_doubts_count}</span>
                         {data.communication.open_private_doubts > 0 && (
                           <span className="text-[10px] font-black text-amber-500">({data.communication.open_private_doubts} open)</span>
                         )}
                      </div>
                   </div>
                   <div className="p-5 glass dark:bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Public Posts</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{data.communication.public_comments_count}</span>
                   </div>
                </div>
                
                <div className="mt-8 pt-8 border-t border-white/5">
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolution Rate</span>
                      <span className="text-xs font-black text-emerald-500">
                        {data.communication.private_doubts_count > 0 
                          ? `${Math.round((data.communication.resolved_private_doubts / data.communication.private_doubts_count) * 100)}%` 
                          : '100%'}
                      </span>
                   </div>
                   <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${data.communication.private_doubts_count > 0 ? (data.communication.resolved_private_doubts / data.communication.private_doubts_count) * 100 : 100}%` }}
                      />
                   </div>
                </div>
             </div>
          </div>

          {/* Quick Actions */}
          <div className="glass dark:bg-white/2 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl">
             <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Quick Actions</h3>
             <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 glass dark:bg-white/5 rounded-2xl border border-white/5 hover:bg-indigo-600 transition-all group">
                   <div className="flex items-center gap-3">
                      <Download size={16} className="text-slate-400 group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Export CSV Report</span>
                   </div>
                   <ChevronRight size={14} className="text-slate-600 group-hover:text-white" />
                </button>
                <button className="w-full flex items-center justify-between p-4 glass dark:bg-white/5 rounded-2xl border border-white/5 hover:bg-indigo-600 transition-all group">
                   <div className="flex items-center gap-3">
                      <TrendingUp size={16} className="text-slate-400 group-hover:text-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white">Trend Forecasting</span>
                   </div>
                   <ChevronRight size={14} className="text-slate-600 group-hover:text-white" />
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomAnalyticsTab;
