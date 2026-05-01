import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Hash, ChevronRight, BookOpen } from 'lucide-react';

const ClassroomCard = ({ classroom }) => {
  const navigate = useNavigate();

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
    <div 
      onClick={() => navigate(`/classrooms/${classroom.id}`)}
      className="group relative glass dark:bg-[#0a0a0a] rounded-[2.5rem] border border-white/60 dark:border-white/5 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full"
    >
      {/* Banner */}
      <div className={`h-32 bg-gradient-to-br ${currentBanner} relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="absolute top-4 right-6">
          <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest border border-white/20">
            {classroom.status}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 flex flex-col flex-1">
        <div className="flex-1">
           <div className="flex items-center gap-2 mb-3">
             <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
               {classroom.subject}
             </span>
             {classroom.join_code && (
               <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                 <Hash className="w-3 h-3" />
                 {classroom.join_code}
               </div>
             )}
           </div>
           
           <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 line-clamp-1 group-hover:text-indigo-500 transition-colors">
             {classroom.name}
           </h3>
           
           <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6">
             {classroom.course} • Semester {classroom.semester} {classroom.section && `• Section ${classroom.section}`}
           </p>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                {classroom.member_count || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                Classroom
              </span>
            </div>
          </div>
          
          <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomCard;
