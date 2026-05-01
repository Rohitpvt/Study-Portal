import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Users, BookOpen, MessageSquare, 
  Settings, Plus, ChevronDown, FileText, 
  ExternalLink, Download, Search, Filter,
  BookOpenCheck, Layout, GraduationCap as GradesIcon,
  Trash2, UserMinus, Hash, Paperclip, Sparkles, Inbox, BarChart3
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
  const [activeTab, setActiveTab] = useState('people');
  const [removingMemberId, setRemovingMemberId] = useState(null);

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

  const currentBanner = bannerColors[classroom.banner_variant] || bannerColors.default;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner */}
      <div className={`relative h-64 bg-gradient-to-br ${currentBanner} rounded-[3rem] overflow-hidden shadow-2xl mb-8`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-4 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20">
              {classroom.subject}
            </span>
            {classroom.join_code && (
              <span className="px-4 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20 flex items-center gap-2">
                <Hash className="w-3 h-3" />
                {classroom.join_code}
              </span>
            )}
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight leading-none mb-2">{classroom.name}</h1>
          <p className="text-lg font-bold text-white/80">{classroom.course} • Semester {classroom.semester} {classroom.section && `• Section ${classroom.section}`}</p>
        </div>
        
        {classroom.can_manage && (
          <button className="absolute top-8 right-10 p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-3xl text-white transition-all">
            <Settings className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.filter(t => !t.hidden).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all ${
              activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4.5 h-4.5" />
            {tab.label}
          </button>
        ))}
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
              <div className="flex items-center justify-between pb-4 border-b-2 border-indigo-500/20 mb-6 px-4">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Teachers</h3>
                <span className="text-sm font-black text-indigo-500 uppercase tracking-widest">Faculty</span>
              </div>
              <div className="space-y-4">
                {classroom.members.filter(m => m.role_in_class === 'teacher').map(teacher => (
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
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-200 dark:border-white/5 mb-6 px-4">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Students</h3>
                <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  {classroom.members.filter(m => m.role_in_class === 'student').length} Enrolled
                </span>
              </div>
              <div className="space-y-4">
                {classroom.members.filter(m => m.role_in_class === 'student').length > 0 ? (
                  classroom.members.filter(m => m.role_in_class === 'student').map(student => (
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
