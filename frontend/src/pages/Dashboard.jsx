import { useEffect, useState } from 'react';
import api from '../services/api';
import { BookOpen, Upload, MessageSquare, ShieldCheck, Star, Cake, Sparkles, PartyPopper, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import ErrorPage from '../components/common/ErrorPage';

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
  if (!user) return <div className="animate-pulse flex p-10 font-bold text-slate-400 dark:text-slate-600">Loading user profile...</div>;

  return (
    <div className="w-full space-y-10 py-6 md:py-8">
      
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

      <div className="hybrid-card relative overflow-hidden group interactive-scale border-0">
        <div className="absolute -top-24 -right-24 w-64 h-64 premium-gradient opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-1000"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 accent-gradient opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-1000"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Welcome back, <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-indigo-400 dark:to-blue-300 uppercase">
                {user.full_name.split(' ')[0]}
              </span>
            </h1>
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <div className="flex flex-col">
                <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Authenticated ID</p>
                <p className="text-slate-800 dark:text-slate-100 font-bold text-sm tracking-tight">{user.email}</p>
              </div>
              {user.roll_no && (
                <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>
              )}
              {user.roll_no && (
                <div className="flex flex-col">
                  <p className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-1">Roll Number</p>
                  <p className="text-indigo-600 dark:text-indigo-400 font-black text-sm tracking-widest">{user.roll_no}</p>
                </div>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-8 font-medium text-lg max-w-2xl leading-relaxed">
              Unlock your potential with our <span className="text-slate-900 dark:text-white font-bold underline decoration-indigo-500/30">tailored study ecosystem</span> for Christ University students.
            </p>
            <div className="mt-8 flex items-center gap-4">
               <span className={`px-6 py-2.5 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all ${user.role?.toLowerCase() === 'admin' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'}`}>
                {user.role} Status
               </span>
               <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Active Hub</span>
               </div>
            </div>
          </div>
          
          <div className="hidden lg:block w-56 h-56 premium-gradient rounded-[3rem] rotate-12 opacity-95 shadow-2xl flex items-center justify-center relative overflow-hidden group-hover:rotate-6 transition-transform duration-700">
             <div className="absolute inset-0 bg-white/10 backdrop-blur-sm -rotate-12 group-hover:rotate-0 transition-transform duration-700"></div>
             <BookOpen className="w-28 h-28 text-white relative z-10 drop-shadow-2xl" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <DashboardCard 
          to="/materials" 
          icon={<BookOpen className="w-10 h-10 text-white" />}
          gradient="premium-gradient"
          title="Library Vault"
          description="Access approved study materials, structured notes, and past examination papers."
        />
        
        {user.role?.toLowerCase() === 'student' && (
          <DashboardCard 
            to="/contributions" 
            icon={<Upload className="w-10 h-10 text-white" />}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            title="Contribution Lab"
            description="Upload your intellectual work to assist peers. Submissions undergo AI verification."
          />
        )}

        {user.role?.toLowerCase() === 'admin' && (
          <DashboardCard 
            to="/admin" 
            icon={<ShieldCheck className="w-10 h-10 text-white" />}
            gradient="bg-gradient-to-br from-rose-500 to-red-600"
            title="Admin Console"
            description="Authorize student work, manage repositories, and oversee system integrity."
          />
        )}

        <DashboardCard 
          to="/chat" 
          icon={<MessageSquare className="w-10 h-10 text-white" />}
          gradient="bg-gradient-to-br from-violet-600 to-purple-700"
          title="Research AI"
          description="Engage with our RAG-powered chatbot for syllabus-specific insights and queries."
        />
        
        <DashboardCard 
          to="/favorites" 
          icon={<Star className="w-10 h-10 text-white" />}
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          title="My Archives"
          description="Your personalized collection of saved notes and bookmarks for quick retrieval."
        />
      </div>
    </div>
  );
}

function DashboardCard({ to, icon, title, description, gradient }) {
  return (
    <Link to={to} className="block group h-full">
      <div className="hybrid-card shadow-lg dark:shadow-none h-full interactive-scale p-8 flex flex-col items-start border-0 !rounded-[3rem]">
        <div className={`${gradient || 'premium-gradient'} p-5 rounded-2xl mb-8 shadow-xl shadow-indigo-500/10 group-hover:rotate-12 transition-all duration-500`}>
          {icon}
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed text-[13px] opacity-80">{description}</p>
        <div className="mt-auto pt-8 flex items-center text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
          Enter Module <span className="text-lg">&rarr;</span>
        </div>
      </div>
    </Link>
  );
}
