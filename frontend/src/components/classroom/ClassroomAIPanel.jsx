import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Sparkles, MessageSquare, 
  Trash2, BookOpen, Clock, X,
  Maximize2, Minimize2, Loader2, Info,
  AlertCircle, Star, Target
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import BrainLoader from '../common/BrainLoader';
import Typewriter from '../common/Typewriter';

const ClassroomAIPanel = ({ classroomId, assignmentId, assignmentAiMode = 'allowed' }) => {
  const { error: toastError, info } = useNotification();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const queryText = input.trim();
    const userMessage = { role: 'user', text: queryText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chat/ask', {
        query: queryText,
        classroom_id: classroomId,
        assignment_id: assignmentId
      });

      const { answer, mode, sources, source_scope } = response.data;
      
      const newMessage = {
        role: 'assistant',
        text: answer,
        mode: mode || 'general',
        source_scope: source_scope || 'global',
        sources: sources || []
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to get AI response.";
      setMessages(prev => [...prev, { role: 'assistant', text: "Error: " + msg, isError: true }]);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    info("Classroom chat cleared.");
  };

  if (assignmentAiMode === 'disabled') {
    return (
      <div className="glass dark:bg-rose-500/5 rounded-[2rem] p-8 border border-rose-500/20 text-center">
         <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
         <h4 className="text-sm font-black text-rose-500 uppercase tracking-widest">AI Assistance Disabled</h4>
         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">The teacher has disabled AI help for this assignment.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col transition-all duration-500 glass dark:bg-[#050505] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden ${isExpanded ? 'h-[600px]' : 'h-[450px]'}`}>
      {/* Header */}
      <div className="px-6 py-5 premium-gradient flex items-center justify-between shadow-lg">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white">
               <Bot className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-sm font-black text-white tracking-tight leading-none">Class AI</h4>
               <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">
                  {assignmentId ? 'Assignment Context Active' : 'Classroom Context Active'}
               </span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <button 
              onClick={clearChat}
              className="p-2 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all"
              title="Clear Chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
         </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white/2"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 opacity-40">
             <Sparkles className="w-12 h-12 text-indigo-500 mb-4 animate-pulse" />
             <h5 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Ask anything about this {assignmentId ? 'assignment' : 'class'}</h5>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 max-w-[200px]">
                AI will prioritize your classroom materials for grounded answers.
             </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
               <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-5 rounded-3xl text-sm font-bold leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : msg.isError 
                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      : 'glass dark:bg-white/5 text-slate-700 dark:text-slate-200 rounded-tl-none border border-white/5'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <Typewriter text={msg.text} skipAnimation={idx !== messages.length - 1} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                  
                  {msg.role === 'assistant' && msg.source_scope && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                      msg.source_scope === 'assignment' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      msg.source_scope === 'classroom' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                      'bg-slate-500/10 text-slate-400 border-white/5'
                    }`}>
                      {msg.source_scope === 'assignment' ? <Target className="w-2.5 h-2.5" /> :
                       msg.source_scope === 'classroom' ? <BookOpen className="w-2.5 h-2.5" /> :
                       <Info className="w-2.5 h-2.5" />}
                      <span>{msg.source_scope} Grounded</span>
                    </div>
                  )}
               </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex justify-start">
             <div className="p-6 glass dark:bg-white/5 rounded-3xl rounded-tl-none flex items-center gap-4">
                <div className="w-8 h-8 relative">
                   <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
                   <div className="absolute inset-0 border-2 border-t-indigo-500 rounded-full animate-spin" />
                </div>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">AI is thinking...</span>
             </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-5 border-t border-white/5 bg-black/20">
         <form onSubmit={handleSend} className="relative group">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={assignmentAiMode === 'hint_only' ? "Ask for a hint..." : "Ask class AI..."}
              className="w-full pl-6 pr-14 py-4 glass dark:bg-white/5 rounded-2xl border border-white/5 outline-none text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <button
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-90 disabled:opacity-50"
            >
               <Send className="w-4 h-4" />
            </button>
         </form>
         <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] text-center mt-3 opacity-60">
            {assignmentAiMode === 'hint_only' ? 'Hint-Only Mode Enabled' : 'Class Context Aware'}
         </p>
      </div>
    </div>
  );
};

export default ClassroomAIPanel;
