import { useEffect, useState } from 'react';
import api from '../services/api';
import { BookOpen, Upload, MessageSquare, ShieldCheck, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/users/me')
      .then(res => setUser(res.data))
      .catch((err) => {
        console.error(err);
        setError("Unable to communicate with the backend server. Is FastAPI running?");
      });
  }, []);

  if (error) return <div className="p-10 font-bold text-red-500 bg-red-50 border border-red-200 rounded-2xl m-8">{error}</div>;
  if (!user) return <div className="animate-pulse flex p-10 font-bold text-slate-400">Loading user profile...</div>;

  return (
    <div className="w-full space-y-10 py-6">
      <div className="glass-card relative overflow-hidden group interactive-scale border-0 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-64 h-64 premium-gradient opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-1000"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 accent-gradient opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-1000"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Welcome back, <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">
                {user.full_name.split(' ')[0]}
              </span>
            </h1>
            <div className="mt-4">
              <p className="text-slate-500 font-black text-sm uppercase tracking-tight opacity-70">
                {user.email}
              </p>
              {user.roll_no && (
                <p className="text-indigo-600 font-black text-xs uppercase tracking-widest mt-1">
                  Roll No: {user.roll_no}
                </p>
              )}
            </div>
            <p className="text-slate-500 mt-6 font-medium text-lg max-w-2xl">
              Ready to excel? Explore your tailored study dashboard for <span className="text-indigo-600 font-bold">Christ University</span> academic success.
            </p>
            <div className="mt-6 flex items-center gap-3">
               <span className={`px-5 py-2 text-[10px] md:text-xs font-black rounded-2xl uppercase tracking-widest shadow-sm ${user.role?.toLowerCase() === 'admin' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {user.role} Account
               </span>
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Session</span>
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
          icon={<BookOpen className="w-10 h-10 text-white" />}
          gradient="premium-gradient"
          title="Study Materials"
          description="Browse and download approved study materials, notes, and past exams."
        />
        
        {user.role?.toLowerCase() === 'student' && (
          <DashboardCard 
            to="/contributions" 
            icon={<Upload className="w-10 h-10 text-white" />}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            title="Contribute"
            description="Upload your own notes to help others. Submissions are reviewed by administrators."
          />
        )}

        {user.role?.toLowerCase() === 'admin' && (
          <DashboardCard 
            to="/admin" 
            icon={<ShieldCheck className="w-10 h-10 text-white" />}
            gradient="bg-gradient-to-br from-rose-500 to-red-600"
            title="Admin Review"
            description="Review student submissions and authorize uploads into the global database."
          />
        )}

        <DashboardCard 
          to="/chat" 
          icon={<MessageSquare className="w-10 h-10 text-white" />}
          gradient="bg-gradient-to-br from-violet-600 to-purple-700"
          title="AI Chatbot"
          description="Ask questions and get answers based on our verified syllabus materials."
        />
        
        <DashboardCard 
          to="/favorites" 
          icon={<Star className="w-10 h-10 text-white" />}
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          title="My Favorites"
          description="Access all your saved notes and materials quickly from one place."
        />
      </div>
    </div>
  );
}

function DashboardCard({ to, icon, title, description, gradient }) {
  return (
    <Link to={to} className="block group h-full">
      <div className="glass-card shadow-lg hover:shadow-indigo-100 h-full interactive-scale p-8 flex flex-col items-start border-0">
        <div className={`${gradient || 'premium-gradient'} p-4 rounded-2xl mb-6 shadow-lg shadow-indigo-100 group-hover:rotate-6 transition-transform duration-500`}>
          {icon}
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">{title}</h3>
        <p className="text-slate-500 font-semibold leading-relaxed text-sm">{description}</p>
        <div className="mt-auto pt-6 flex items-center text-indigo-600 font-black text-xs uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          Open Now <span>&rarr;</span>
        </div>
      </div>
    </Link>
  );
}
