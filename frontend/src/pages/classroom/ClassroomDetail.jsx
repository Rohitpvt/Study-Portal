import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Users, BookOpen, MessageSquare, 
  Settings, Plus, ChevronDown, FileText, 
  ExternalLink, Download, Search, Filter,
  BookOpenCheck, Layout, GraduationCap as GradesIcon,
  Trash2, UserMinus, Hash, Paperclip, Sparkles, Inbox, BarChart3,
  Copy, Check
} from 'lucide-react';
import ClassroomMaterialsTab from '../../components/classroom/ClassroomMaterialsTab';
import ClassroomStreamTab from '../../components/classroom/ClassroomStreamTab';
import ClassroomClassworkTab from '../../components/classroom/ClassroomClassworkTab';
import ClassroomAIPanel from '../../components/classroom/ClassroomAIPanel';
import TeacherDoubtInbox from '../../components/classroom/TeacherDoubtInbox';
import ClassroomAnalyticsTab from '../../components/classroom/ClassroomAnalyticsTab';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const ClassroomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { success, error } = useNotification();
  
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stream');
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyJoinCode = () => {
    if (!classroom?.join_code) return;
    navigator.clipboard.writeText(classroom.join_code);
    setCopiedCode(true);
    success(`Class code ${classroom.join_code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const fetchClassroom = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/classrooms/${id}`);
      setClassroom(res.data);
    } catch (err) {
      error('Failed to load classroom details.');
      navigate('/classrooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroom();
  }, [id]);

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    
    setRemovingMemberId(userId);
    try {
      await api.delete(`/classrooms/${id}/members/${userId}`);
      success('Member removed successfully.');
      fetchClassroom();
    } catch (err) {
      error(err.response?.data?.detail || 'Failed to remove member.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="h-64 glass dark:bg-[#0a0a0a] rounded-[3rem] animate-pulse mb-8" />
        <div className="flex gap-4 mb-10 overflow-hidden">
          {[...Array(5)].map((_, i) => (
             <div key={i} className="h-14 w-32 glass dark:bg-[#0a0a0a] rounded-2xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'stream', label: 'Stream', icon: MessageSquare },
    { id: 'classwork', label: 'Classwork', icon: Layout },
    { id: 'materials', label: 'Materials', icon: BookOpen },
    { id: 'people', label: 'People', icon: Users },
    { id: 'ai', label: 'Class AI', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, hidden: !classroom?.can_manage },
    { id: 'doubts', label: 'Doubts', icon: Inbox, hidden: !classroom?.can_manage },
    { id: 'grades', label: 'Grades', icon: GradesIcon },
  ];

  const bannerColors = {
    blue: 'from-blue-600 to-indigo-700',
    purple: 'from-purple-600 to-violet-800',
    emerald: 'from-emerald-500 to-teal-700',
    amber: 'from-amber-400 to-orange-600',
    rose: 'from-rose-500 to-pink-700',
    default: 'from-slate-700 to-slate-900'
  };

  const currentBanner = bannerColors[classroom?.banner_variant] || bannerColors.default;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Classroom Header */}
      <div className="relative rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden mb-8 sm:mb-10 group shadow-2xl border border-white/10 dark:border-white/5 transition-all">
        {/* Ambient Gradient Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${currentBanner}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
        
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-10 lg:p-12 flex flex-col justify-end min-h-[220px] sm:min-h-[250px]">
          {/* Top Row: Badges & Settings */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/30 hover:bg-black/40 backdrop-blur-md rounded-full text-xs font-bold text-white/95 border border-white/15 shadow-sm transition-colors">
                <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
                {classroom.subject}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full text-xs font-bold text-white/95 border border-white/15 shadow-sm">
                <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
                {classroom.course} • Sem {classroom.semester}
              </span>
            </div>

            {classroom.can_manage && (
              <button 
                className="p-3 bg-black/25 hover:bg-black/40 backdrop-blur-md rounded-2xl text-white/90 hover:text-white border border-white/15 transition-all interactive-scale"
                aria-label="Classroom Settings"
                title="Classroom Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Title and Join Code */}
          <div className="space-y-3 mt-auto">
            <h1 className="text-2xl sm:text-4xl lg:text-[2.6rem] font-extrabold text-white tracking-tight drop-shadow-md leading-tight max-w-4xl">
              {classroom.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button 
                onClick={copyJoinCode}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-black/35 hover:bg-black/50 active:scale-95 backdrop-blur-md rounded-xl text-xs font-bold text-white border border-white/15 transition-all shadow-sm group"
                title="Click to copy class code"
              >
                <span className="text-white/70 font-medium">Class Code:</span>
                <span className="font-mono font-black tracking-wider text-amber-300 bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                  {classroom.join_code}
                </span>
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors" />
                )}
              </button>
              
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-xs font-semibold text-white/80 border border-white/10">
                <Users className="w-3.5 h-3.5 text-white/70" />
                <span>{(classroom.members || []).length} {(classroom.members || []).length === 1 ? 'Member' : 'Members'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="w-full flex justify-center mb-8 sm:mb-10">
        <div className="p-1.5 glass dark:bg-[#0c0d12]/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-white/10 inline-flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide shadow-lg shadow-black/5 dark:shadow-none max-w-full">
          {tabs.filter(t => !t.hidden).map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap shrink-0 interactive-scale ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                }`}
                aria-label={`${tab.label} tab`}
                aria-selected={isActive}
                role="tab"
              >
                <tab.icon className={`w-4 h-4 transition-transform ${isActive ? 'text-white scale-110' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'stream' && (
          <ClassroomStreamTab 
            classroom={classroom} 
            canManage={classroom.can_manage} 
          />
        )}

        {activeTab === 'classwork' && (
          <ClassroomClassworkTab 
            classroom={classroom} 
            canManage={classroom.can_manage} 
          />
        )}

        {activeTab === 'materials' && (
          <ClassroomMaterialsTab 
            classroom={classroom} 
            canManage={classroom.can_manage} 
          />
        )}

        {activeTab === 'people' && (
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Teachers */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20 mb-6 px-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Teachers</h3>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Faculty</span>
              </div>
              <div className="space-y-4">
                {(classroom.members || []).filter(m => m.role_in_class === 'teacher').map(teacher => (
                  <div key={teacher.user_id} className="flex items-center justify-between p-6 glass dark:bg-[#0a0a0a] rounded-[2rem] border border-white/60 dark:border-white/5">
                    <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-black text-xl shadow-sm border border-indigo-500/10">
                          {teacher.full_name?.substring(0,1).toUpperCase() || 'T'}
                       </div>
                       <div>
                         <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{teacher.full_name}</h4>
                         <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{teacher.email}</p>
                       </div>
                    </div>
                    {teacher.user_id === classroom.created_by_teacher_id && (
                      <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                        Owner
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Students */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5 mb-6 px-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Students</h3>
                <span className="text-xs font-semibold text-slate-400">
                  {(classroom.members || []).filter(m => m.role_in_class === 'student').length} Enrolled
                </span>
              </div>
              <div className="space-y-4">
                {(classroom.members || []).filter(m => m.role_in_class === 'student').length > 0 ? (
                  (classroom.members || []).filter(m => m.role_in_class === 'student').map(student => (
                    <div key={student.user_id} className="group flex items-center justify-between p-5 glass dark:bg-[#0a0a0a] rounded-[2rem] border border-white/60 dark:border-white/5 hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 font-black text-lg">
                            {student.full_name?.substring(0,1).toUpperCase() || 'S'}
                         </div>
                         <div>
                           <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{student.full_name}</h4>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{student.email}</p>
                         </div>
                      </div>
                      
                      {classroom.can_remove_member && (
                        <button 
                          onClick={() => handleRemoveMember(student.user_id)}
                          disabled={removingMemberId === student.user_id}
                          className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Remove Member"
                        >
                          {removingMemberId === student.user_id ? (
                            <div className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                          ) : (
                            <UserMinus className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <p className="text-sm font-bold text-slate-400 italic">No students enrolled yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="py-20 text-center glass dark:bg-[#0a0a0a] rounded-[3rem] border border-white/60 dark:border-white/5">
             <GradesIcon className="w-16 h-16 text-slate-300 dark:text-white/10 mx-auto mb-6" />
             <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Grades</h3>
             <p className="text-slate-500 font-bold">Gradebook and performance analytics will be available here.</p>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="max-w-4xl mx-auto">
             <ClassroomAIPanel classroomId={id} />
          </div>
        )}

        {activeTab === 'doubts' && classroom.can_manage && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <TeacherDoubtInbox classroomId={id} />
          </div>
        )}

        {activeTab === 'analytics' && classroom.can_manage && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <ClassroomAnalyticsTab classroomId={id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomDetail;
