import React, { useState, useEffect } from 'react';
import { Plus, Hash, GraduationCap, Users, Search } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ClassroomCard from '../../components/classroom/ClassroomCard';
import CreateClassroomModal from '../../components/classroom/CreateClassroomModal';
import JoinClassroomModal from '../../components/classroom/JoinClassroomModal';

const ClassroomList = () => {
  const { userProfile } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isTeacherPlus = userProfile?.role === 'TEACHER' || userProfile?.role === 'ADMIN' || userProfile?.role === 'DEVELOPER';
  const isAdminPlus = userProfile?.role === 'ADMIN' || userProfile?.role === 'DEVELOPER';

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/classrooms/');
      setClassrooms(res.data);
    } catch (err) {
      console.error('Failed to fetch classrooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const filteredClassrooms = classrooms.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-500 rounded-[2rem] shadow-2xl shadow-indigo-500/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {isAdminPlus ? 'All Classrooms' : 'My Classrooms'}
            </h1>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">Manage your academic courses and materials.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isTeacherPlus && (
            <button 
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              Create Classroom
            </button>
          )}
          <button 
            onClick={() => setIsJoinOpen(true)}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
              !isTeacherPlus 
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' 
                : 'bg-white dark:bg-white/5 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 hover:border-indigo-500'
            }`}
          >
            <Hash className="w-4 h-4" />
            Join with Code
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search your classes..."
          className="w-full pl-12 pr-4 py-4 glass dark:bg-[#0a0a0a] rounded-2xl text-sm font-bold text-slate-700 dark:text-white border border-white/60 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 glass dark:bg-[#0a0a0a] rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : filteredClassrooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredClassrooms.map(classroom => (
            <ClassroomCard key={classroom.id} classroom={classroom} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No Classrooms Found</h3>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-xs">
            {searchQuery ? "We couldn't find any classes matching your search." : "You haven't joined any classrooms yet. Use a code to get started."}
          </p>
        </div>
      )}

      {/* Modals */}
      <CreateClassroomModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={fetchClassrooms}
      />
      <JoinClassroomModal 
        isOpen={isJoinOpen} 
        onClose={() => setIsJoinOpen(false)} 
        onSuccess={fetchClassrooms}
      />
    </div>
  );
};

export default ClassroomList;
