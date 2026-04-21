import React from 'react';
import { 
  Info, 
  Target, 
  Cpu, 
  BookOpen, 
  Bot, 
  Search, 
  UploadCloud, 
  UserCircle, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Layers,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  const features = [
    {
      title: "Study Materials Library",
      desc: "Access a curated collection of course-specific resources, organized for maximum efficiency.",
      icon: BookOpen,
      color: "blue"
    },
    {
      title: "RAG AI Chatbot",
      desc: "Get instant, context-aware answers extracted directly from your course materials using advanced AI.",
      icon: Bot,
      color: "indigo"
    },
    {
      title: "Smart Semantic Search",
      desc: "Find exactly what you need with filters for course, subject, and semester.",
      icon: Search,
      color: "purple"
    },
    {
      title: "Contribution System",
      desc: "Share your own materials and help the community grow with a secure, moderated workflow.",
      icon: UploadCloud,
      color: "emerald"
    },
    {
      title: "Profile Sync",
      desc: "A personalized experience that syncs across devices with custom avatar support.",
      icon: UserCircle,
      color: "orange"
    },
    {
      title: "Admin Moderation",
      desc: "Quality control and security overseen by human administrators to ensure data integrity.",
      icon: ShieldCheck,
      color: "rose"
    }
  ];

  const stats = [
    { label: "AI Integration", value: "RAG Powered", icon: Bot },
    { label: "Community Driven", value: "Verified Contributions", icon: Users },
    { label: "Security First", value: "Auth Protected", icon: ShieldCheck },
    { label: "User Experience", value: "Responsive Design", icon: Zap }
  ];

  // Users helper stat
  function Users({className}) { return <UserCircle className={className} />; }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Section */}
      <section className="text-center relative">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -z-10"></div>
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-sm font-bold mb-6 border border-indigo-100 shadow-sm">
          <Sparkles className="w-4 h-4" />
          <span>Intelligent Academic Hub</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-8 transition-colors">
          The Next Generation of <br />
          <span className="premium-gradient bg-clip-text text-transparent">Academic Collaboration</span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-10 transition-colors">
          CU Study Portal bridge the gap between traditional learning and AI-assisted efficiency, 
          empowering students with verified resources and intelligent search.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/materials" className="premium-gradient px-8 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 dark:shadow-none flex items-center gap-2 hover:translate-y-[-2px] transition-all active:scale-95">
            Explore Library <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/contact" className="bg-white dark:bg-slate-800 px-8 py-4 rounded-2xl text-slate-700 dark:text-slate-200 font-black uppercase tracking-widest text-sm border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">
            Contact Support
          </Link>
        </div>
      </section>

      {/* Mission Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center pt-8">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center p-2">
               <Target className="w-full h-full" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest">Our Mission</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white leading-tight transition-colors">Empowering Students Through Information & AI.</h2>
          <div className="space-y-4 text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed transition-colors">
            <p>
              Traditional study material silos make it difficult for students to find accurate, course-specific resources. 
              Our mission is to consolidate these fragments into a centralized, intelligent portal.
            </p>
            <p>
              By combining community-driven contributions with a Retrieval-Augmented Generation (RAG) AI system, 
              we ensure that answers aren't just intelligent—they're accurate to the materials provided by your instructors.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
           <div className="bg-indigo-600 dark:bg-indigo-700 rounded-[32px] p-8 text-white space-y-4 shadow-2xl shadow-indigo-200 dark:shadow-none">
              <Layers className="w-10 h-10 opacity-70" />
              <div className="text-3xl font-black italic">62+</div>
              <div className="text-sm font-bold uppercase tracking-wider opacity-90">Validated Chunks of knowledge</div>
           </div>
           <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-xl mt-12 transition-colors">
              <Cpu className="text-indigo-600 dark:text-indigo-400 w-10 h-10 mb-4" />
              <div className="text-3xl font-black italic text-slate-800 dark:text-white">100%</div>
              <div className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">AI Accuracy Guarantee</div>
           </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-16">
        <div className="text-center space-y-4">
           <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Powerful Features for Every Student</h2>
           <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] text-sm transition-colors">Engineered for Academic Excellence</p>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="glass dark:bg-slate-900/50 group p-8 rounded-[32px] hover:bg-white dark:hover:bg-slate-800 transition-all duration-500 border border-transparent dark:border-slate-800/50 hover:border-slate-100 dark:hover:border-slate-700 hover:shadow-2xl dark:hover:shadow-none hover:translate-y-[-8px]">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 shadow-sm
                  ${f.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
                  ${f.color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : ''}
                  ${f.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : ''}
                  ${f.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : ''}
                  ${f.color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : ''}
                  ${f.color === 'rose' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' : ''}
               `}>
                  <f.icon className="w-7 h-7" />
               </div>
               <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3 transition-colors">{f.title}</h3>
               <p className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed text-sm transition-colors">
                 {f.desc}
               </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-8 bg-slate-900 rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
        {stats.map((s, i) => (
          <div key={i} className="text-center space-y-4">
             <div className="flex justify-center">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                   <s.icon className="w-6 h-6 text-indigo-300" />
                </div>
             </div>
             <div className="space-y-1">
                <div className="text-2xl font-black italic">{s.value}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{s.label}</div>
             </div>
          </div>
        ))}
      </section>

      {/* CTA Section */}
      <section className="premium-gradient rounded-[48px] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 blur-[80px] rounded-full"></div>
        <div className="relative z-10 space-y-8">
           <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">Ready to Transform Your <br /> Learning Experience?</h2>
           <p className="max-w-xl mx-auto text-lg font-bold opacity-90">
             Join the Christ University community today. Explore materials, contribute your knowledge, 
             and experience the power of RAG AI.
           </p>
           <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
              <Link to="/dashboard" className="bg-white text-indigo-600 px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-black/10 hover:bg-slate-50 transition-all active:scale-95">
                Go to Terminal
              </Link>
              <Link to="/contact" className="bg-indigo-800/30 backdrop-blur-md text-white border border-white/20 px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all active:scale-95">
                Have Questions?
              </Link>
           </div>
        </div>
      </section>

    </div>
  );
}
