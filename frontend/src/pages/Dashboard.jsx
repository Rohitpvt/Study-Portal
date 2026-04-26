import { useEffect, useState } from 'react';
import api from '../services/api';
import { BookOpen, Upload, MessageSquare, ShieldCheck, Star, Cake, Sparkles, PartyPopper, Gift, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import ErrorPage from '../components/common/ErrorPage';
import Onboarding from '../components/common/Onboarding';
import { Skeleton, SkeletonCard, SkeletonCircle, SkeletonTitle, SkeletonText } from '../components/common/Skeleton';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [isBirthdayDismissed, setIsBirthdayDismissed] = useState(false);

  useEffect(() => {
    api.get('/users/me')
      .then(res => {
        const userData = res.data;
        setUser(userData);
        
        // 1. Safe Birthday Detection
        if (userData.date_of_birth) {
          const today = new Date();
          const todayShort = `${today.getMonth() + 1}-${today.getDate()}`; // M-D
          
          // API date is usually YYYY-MM-DD
          const [y, m, d] = userData.date_of_birth.split('-').map(n => parseInt(n));
          const isBirthdayToday = (m === (today.getMonth() + 1)) && (d === today.getDate());
          
          if (isBirthdayToday) {
            const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
            const storageKey = `birthday_banner_dismissed_${userData.email}_${dateKey}`;
            if (sessionStorage.getItem(storageKey)) {
              setIsBirthdayDismissed(true);
            }
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to communicate with the backend server. Is FastAPI running?");
      });
  }, []);

  const handleDismissBirthday = () => {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const storageKey = `birthday_banner_dismissed_${user.email}_${dateKey}`;
    sessionStorage.setItem(storageKey, 'true');
    setIsBirthdayDismissed(true);
  };

  const isBirthday = user?.date_of_birth && (() => {
    const today = new Date();
    const [y, m, d] = user.date_of_birth.split('-').map(n => parseInt(n));
    return (m === (today.getMonth() + 1)) && (d === today.getDate());
  })();

  if (error) return <ErrorPage type="api" fullScreen={false} message={error} onRetry={() => window.location.reload()} />;
  if (!user) return <DashboardSkeleton />;

  return (
    <div className="w-full space-y-10 py-6 md:py-8 animate-fade-in-up stagger-1">
      
      {/* ── Birthday Celebration Section ─────────────────────────────────── */}
      {isBirthday && !isBirthdayDismissed && (
        <div className="mb-8 relative overflow-hidden group rounded-[40px] p-8 md:p-10 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 shadow-2xl shadow-rose-200/50 animate-in fade-in slide-in-from-top-10 duration-1000">
           <div className="absolute inset-0 animate-shimmer-festive pointer-events-none opacity-30"></div>
           
           {/* Decorative Icons */}
           <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
           <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-200/20 rounded-full blur-2xl"></div>

           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/30 shadow-xl animate-birthday-bounce">
                    <Cake className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-lg" />
                 </div>
                 <div className="text-center md:text-left">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md">
                       Happy Birthday, {user.display_name || user.full_name.split(' ')[0]}! 🎂
                    </h2>
                    <p className="text-white/90 font-bold mt-2 text-lg drop-shadow-sm flex items-center justify-center md:justify-start gap-2">
                       Wishing you a spectacular year of academic excellence! <Sparkles className="w-5 h-5 text-amber-200" />
                    </p>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="hidden sm:flex -space-x-2">
                    <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center text-white"><PartyPopper className="w-5 h-5" /></div>
                    <div className="w-10 h-10 rounded-full bg-amber-400 border-2 border-white/50 flex items-center justify-center text-white"><Gift className="w-5 h-5" /></div>
                 </div>
                 <button 
                   onClick={handleDismissBirthday}
                   className="px-8 py-4 bg-white text-rose-600 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-rose-50 transition-all active:scale-95 shadow-lg shadow-rose-900/10"
                 >
                    Thanks!
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="glass-card relative overflow-hidden group interactive-scale border-0 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-64 h-64 premium-gradient opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-1000"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 accent-gradient opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-1000"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Welcome back, <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-indigo-400 dark:to-blue-300">
                {user.full_name.split(' ')[0]}
              </span>
            </h1>
            <div className="mt-4">
              <p className="text-slate-500 dark:text-slate-400 font-black text-sm uppercase tracking-tight opacity-70">
                {user.email}
              </p>
              {user.roll_no && (
                <p className="text-indigo-600 font-black text-xs uppercase tracking-widest mt-1">
                  Roll No: {user.roll_no}
                </p>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-300 mt-6 font-medium text-lg max-w-2xl">
              Ready to excel? Explore your tailored study dashboard for <span className="text-indigo-600 dark:text-indigo-400 font-bold">Christ University</span> academic success.
            </p>
            <div className="mt-6 flex items-center gap-3">
               <span className={`px-5 py-2 text-[10px] md:text-xs font-black rounded-2xl uppercase tracking-widest shadow-sm transition-colors ${
                 user.role?.toLowerCase() === 'developer' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                 user.role?.toLowerCase() === 'admin' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 
                 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
               }`}>
                {user.role} Account
               </span>
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Session</span>
            </div>
          </div>
          
          <div className="hidden lg:block w-48 h-48 premium-gradient rounded-[40px] rotate-12 opacity-90 shadow-2xl flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-white/10 backdrop-blur-sm -rotate-12"></div>
             <BookOpen className="w-24 h-24 text-white relative z-10" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <DashboardCard 
          to="/materials" 
          index={2}
          icon={<BookOpen className="w-10 h-10 text-white" />}
          gradient="premium-gradient"
          title="Study Materials"
          description="Browse and download approved study materials, notes, and past exams."
        />
        
        {user.role?.toLowerCase() === 'student' && (
          <DashboardCard 
            to="/contributions" 
            index={3}
            icon={<Upload className="w-10 h-10 text-white" />}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            title="Contribute"
            description="Upload your own notes to help others. Submissions are reviewed by administrators."
          />
        )}

        {['admin', 'developer'].includes(user.role?.toLowerCase()) && (
          <DashboardCard 
            to="/admin" 
            index={3}
            icon={<ShieldCheck className="w-10 h-10 text-white" />}
            gradient="bg-gradient-to-br from-rose-500 to-red-600"
            title="Admin Review"
            description="Review student submissions and authorize uploads into the global database."
          />
        )}
        
        {user.role?.toLowerCase() === 'developer' && (
          <DashboardCard 
            to="/profile-control" 
            index={3}
            icon={<Crown className="w-10 h-10 text-white" />}
            gradient="bg-gradient-to-br from-amber-500 to-amber-700"
            title="Profile Control"
            description="Manage user roles, elevate students to admins, and monitor platform access."
          />
        )}

        <DashboardCard 
          to="/chat" 
          index={4}
          icon={<MessageSquare className="w-10 h-10 text-white" />}
          gradient="bg-gradient-to-br from-violet-600 to-purple-700"
          title="AI Chatbot"
          description="Ask questions and get answers based on our verified syllabus materials."
        />
        
        <DashboardCard 
          to="/favorites" 
          index={5}
          icon={<Star className="w-10 h-10 text-white" />}
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          title="My Favorites"
          description="Access all your saved notes and materials quickly from one place."
        />
      </div>
      <Onboarding />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="w-full space-y-10 py-6 md:py-8">
      {/* Hero Skeleton */}
      <div className="glass-card p-10 border-0 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <Skeleton height="3rem" width="60%" className="mb-2" />
            <Skeleton height="3rem" width="40%" />
            <div className="mt-8 space-y-2">
              <SkeletonText lines={2} />
            </div>
            <div className="mt-8 flex gap-3">
              <Skeleton width="100px" height="2rem" className="rounded-2xl" />
              <Skeleton width="120px" height="2rem" className="rounded-2xl" />
            </div>
          </div>
          <div className="hidden lg:block">
            <Skeleton width="12rem" height="12rem" className="rounded-[40px] rotate-12" />
          </div>
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
      </div>
    </div>
  );
}

function DashboardCard({ to, icon, title, description, gradient, index = 1 }) {
  return (
    <Link to={to} className={`block group h-full animate-fade-in-up stagger-${index}`}>
      <div className="glass-card shadow-lg hover:shadow-indigo-100 dark:shadow-slate-900/50 dark:hover:shadow-indigo-900/20 h-full interactive-scale p-8 flex flex-col items-start border-0">
        <div className={`${gradient || 'premium-gradient'} p-4 rounded-2xl mb-6 shadow-lg shadow-indigo-100 dark:shadow-none group-hover:rotate-6 transition-transform duration-500`}>
          {icon}
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed text-sm">{description}</p>
        <div className="mt-auto pt-6 flex items-center text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          Open Now <span>&rarr;</span>
        </div>
      </div>
    </Link>
  );
}
