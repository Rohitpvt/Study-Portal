import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Download, Star, 
  Undo2, Filter, Loader2, ClipboardList
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import SubmissionCard from './SubmissionCard';
import GradeSubmissionModal from './GradeSubmissionModal';

const TeacherSubmissionsPanel = ({ classroomId, assignment }) => {
  const { success, error } = useNotification();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Modal States
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubmissions = async () => {
    try {
      const res = await api.get(`/classrooms/${classroomId}/assignments/${assignment.id}/submissions`);
      setSubmissions(res.data);
    } catch (err) {
      error('Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [assignment.id]);

  const handleGrade = async (data) => {
    setActionLoading(true);
    try {
      await api.patch(`/classrooms/${classroomId}/assignments/${assignment.id}/submissions/${selectedSub.id}/grade`, data);
      success('Submission graded successfully!');
      setIsGradeModalOpen(false);
      fetchSubmissions();
    } catch (err) {
      error(err.response?.data?.detail || 'Failed to grade submission.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (sub) => {
    if (!window.confirm(`Return ${sub.student_name}'s work for revision? This will allow them to resubmit.`)) return;
    try {
      await api.post(`/classrooms/${classroomId}/assignments/${assignment.id}/submissions/${sub.id}/return`);
      success('Submission returned for revision.');
      fetchSubmissions();
    } catch (err) {
      error('Failed to return submission.');
    }
  };

  const handleDownload = async (sub) => {
    try {
      const res = await api.get(`/classrooms/${classroomId}/assignments/${assignment.id}/submissions/${sub.id}/file`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', sub.original_filename || 'submission');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      error('Failed to download file.');
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.student_name.toLowerCase().includes(search.toLowerCase()) || 
                         sub.roll_no?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filter === 'all') return true;
    return sub.status === filter;
  });

  if (loading) return (
    <div className="py-20 flex justify-center">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
               <Users className="w-7 h-7" />
            </div>
            <div>
               <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Student Submissions</h3>
               <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{submissions.length} total entries</p>
            </div>
         </div>
         
         <div className="flex items-center gap-4">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text"
                 placeholder="Search student..."
                 className="pl-12 pr-6 py-3 glass dark:bg-white/5 rounded-2xl border border-white/5 outline-none text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 transition-all w-full md:w-64"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
            </div>
            <div className="flex items-center gap-1.5 p-1 glass dark:bg-white/5 rounded-2xl border border-white/5">
               {['all', 'submitted', 'late', 'graded'].map(f => (
                 <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
                 >
                   {f}
                 </button>
               ))}
            </div>
         </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
         {filteredSubmissions.length > 0 ? (
           filteredSubmissions.map(sub => (
             <SubmissionCard 
              key={sub.id}
              submission={sub}
              onGrade={(s) => { setSelectedSub(s); setIsGradeModalOpen(true); }}
              onReturn={handleReturn}
              onDownload={handleDownload}
             />
           ))
         ) : (
           <div className="py-24 text-center glass dark:bg-white/2 rounded-[3rem] border border-white/5">
              <ClipboardList className="w-16 h-16 text-slate-300 dark:text-white/10 mx-auto mb-6" />
              <h4 className="text-xl font-black text-slate-900 dark:text-white">No submissions matching filters</h4>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Try adjusting your search or filters.</p>
           </div>
         )}
      </div>

      {/* Grading Modal */}
      <GradeSubmissionModal 
        isOpen={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
        submission={selectedSub}
        maxPoints={assignment.points}
        onSubmit={handleGrade}
        loading={actionLoading}
      />
    </div>
  );
};

export default TeacherSubmissionsPanel;
