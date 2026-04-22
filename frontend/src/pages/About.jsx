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
    <div className="max-w-6xl mx-auto py-16 px-4 space-y-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      
      {/* Hero Section */}
      <section className="text-center relative">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[140px] rounded-full -z-10 animate-pulse"></div>
        <div className="inline-flex items-center gap-3 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-10 border border-indigo-600/20 shadow-xl shadow-indigo-600/5">
          <Sparkles className="w-4 h-4" />
          <span>Intelligent Academic Ecosystem</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9] mb-10 uppercase">
          Evolving <br />
          <span className="text-indigo-600">Collaboration</span>
        </h1>
        <p className="max-w-3xl mx-auto text-xl text-slate-500 dark:text-slate-400 font-bold leading-relaxed mb-14 transition-colors">
          CU Study Portal bridges the gap between static archives and AI-assisted intelligence, 
          empowering the next generation of researchers with verified academic assets.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link to="/materials" className="px-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-indigo-600/30 flex items-center gap-3 interactive-scale">
            Access Library <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/contact" className="px-10 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl interactive-scale">
            Contact Support
          </Link>
        </div>
      </section>

      {/* Mission Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        <div className="space-y-10">
          <div className="inline-flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/20">
               <Target className="w-7 h-7" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-indigo-600">The Directive</span>
          </div>
          <h2 className="text-5xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">Intelligence through consolidation.</h2>
          <div className="space-y-6 text-lg text-slate-500 dark:text-slate-400 font-bold leading-relaxed transition-colors">
            <p>
              Academic resource fragmentation hinders collective progress. Our directive is to consolidate disparate course materials into a centralized, AI-indexed knowledge base.
            </p>
            <p>
              By leveraging Retrieval-Augmented Generation (RAG), we transform static documents into dynamic consultants, ensuring that every answer is grounded in institutional truth.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
           <div className="hybrid-card p-10 bg-indigo-600 text-white space-y-5 border-0 shadow-2xl shadow-indigo-600/20 interactive-scale">
              <Layers className="w-12 h-12 opacity-50" />
              <div className="text-5xl font-black italic tracking-tighter">62K+</div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Knowledge Vectors Indexing</div>
           </div>
           <div className="hybrid-card p-10 mt-12 interactive-scale">
              <Cpu className="text-indigo-600 w-12 h-12 mb-5" />
              <div className="text-5xl font-black italic tracking-tighter text-slate-900 dark:text-white">100%</div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">AI Grounding Protocol</div>
           </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-20">
        <div className="text-center space-y-6">
           <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase">System Capabilities</h2>
           <p className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.4em] text-[10px]">High-Fidelity Research Infrastructure</p>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="hybrid-card group p-10 transition-all duration-700 hover:border-indigo-600/30">
               <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-700 shadow-lg group-hover:rotate-6
                  ${f.color === 'blue' ? 'bg-blue-600 text-white shadow-blue-600/20' : ''}
                  ${f.color === 'indigo' ? 'bg-indigo-600 text-white shadow-indigo-600/20' : ''}
                  ${f.color === 'purple' ? 'bg-purple-600 text-white shadow-purple-600/20' : ''}
                  ${f.color === 'emerald' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : ''}
                  ${f.color === 'orange' ? 'bg-orange-600 text-white shadow-orange-600/20' : ''}
                  ${f.color === 'rose' ? 'bg-rose-600 text-white shadow-rose-600/20' : ''}
               `}>
                  <f.icon className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4 transition-colors uppercase tracking-tight">{f.title}</h3>
               <p className="text-[13px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed transition-colors">
                 {f.desc}
               </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-12 bg-slate-950 rounded-[4rem] p-16 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 blur-[140px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
        {stats.map((s, i) => (
          <div key={i} className="text-center space-y-6">
             <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                   <s.icon className="w-7 h-7 text-indigo-400" />
                </div>
             </div>
             <div className="space-y-2">
                <div className="text-3xl font-black italic tracking-tighter uppercase">{s.value}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">{s.label}</div>
             </div>
          </div>
        ))}
      </section>

      {/* CTA Section */}
      <section className="hybrid-card bg-indigo-600 p-16 md:p-24 text-center text-white border-0 relative overflow-hidden shadow-2xl shadow-indigo-600/40">
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-white/10 blur-[140px] rounded-full"></div>
        <div className="relative z-10 space-y-10">
           <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] uppercase">Initiate Your <br /> Knowledge Shift</h2>
           <p className="max-w-2xl mx-auto text-xl font-bold opacity-80 leading-relaxed">
             Join the Christ University community. Synergize your research, contribute knowledge, 
             and experience the absolute power of RAG AI.
           </p>
           <div className="flex flex-wrap items-center justify-center gap-8 pt-6">
              <Link to="/dashboard" className="bg-white text-indigo-600 px-12 py-6 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-black/10 hover:bg-slate-50 transition-all active:scale-95">
                Go to Terminal
              </Link>
              <Link to="/contact" className="bg-indigo-900/40 backdrop-blur-xl text-white border border-white/20 px-12 py-6 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-white/10 transition-all active:scale-95">
                Inquiry Support
              </Link>
           </div>
        </div>
      </section>

    </div>

    </div>
  );
}
