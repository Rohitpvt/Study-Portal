import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Send, Bot, User, BookOpen, FileText, Info, ExternalLink, Plus, MessageSquare, Menu, X, Trash2, Clock, Search, Edit3, Check, Square, Code, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { resolveUserAvatar, getOnlineStatus, handleAvatarError } from '../utils/avatarUtils';
import { Skeleton, SkeletonCircle, SkeletonTitle, SkeletonText } from '../components/common/Skeleton';
import MaterialLoader from '../components/common/MaterialLoader';
import Typewriter from '../components/common/Typewriter';
import BrainLoader from '../components/common/BrainLoader';

const INITIAL_GREETING = { 
  role: 'assistant', 
  text: 'Hello! I am your AI Study Assistant. I can search through all approved study materials. What would you like to learn today?',
  mode: null,
  sources: []
};

export default function Chat() {
  const navigate = useNavigate();
  const { success, error: toastError, info, warn } = useNotification();
  const [messages, setMessages] = useState([INITIAL_GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const { userProfile } = useAuth();
  const [newAssistantMessageIndex, setNewAssistantMessageIndex] = useState(null);
  
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/chat/sessions');
      setSessions(response.data.sessions);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  };

  const loadSession = async (sessionId) => {
    if (activeSessionId === sessionId) return;
    
    setIsFetchingHistory(true);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
    
    try {
      setNewAssistantMessageIndex(null); // Reset when loading new session
      const response = await api.get(`/chat/sessions/${sessionId}`);
      const { messages: historyMessages } = response.data;
      
      // Map backend messages to frontend format
      const formatted = historyMessages.map(m => ({
        role: m.role,
        text: m.content,
        mode: m.mode || 'general',
        response_type: m.response_type || 'text',
        sources: m.sources || [] // Validator in backend handles JSON parsing
      }));
      
      setMessages(formatted.length > 0 ? formatted : [INITIAL_GREETING]);
      setActiveSessionId(sessionId);
    } catch (err) {
      console.error("Error loading session:", err);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([INITIAL_GREETING]);
    setNewAssistantMessageIndex(null);
    setIsSidebarOpen(false);
    info("New chat session started");
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      success("Conversation deleted.");
      
      if (activeSessionId === sessionId) {
        startNewChat();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
      toastError("Failed to delete session.");
    }
  };

  const startRename = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title || 'New Chat');
  };

  const handleRename = async (sessionId) => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle || trimmedTitle === sessions.find(s => s.id === sessionId)?.title) {
      setEditingId(null);
      return;
    }

    try {
      await api.patch(`/chat/sessions/${sessionId}`, { title: trimmedTitle });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: trimmedTitle } : s));
      success("Chat renamed.");
    } catch (err) {
      console.error("Error renaming session:", err);
      toastError("Failed to rename session.");
    } finally {
      setEditingId(null);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isFetchingHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const queryText = input.trim();
    const userMessage = { role: 'user', text: queryText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      abortControllerRef.current = new AbortController();
      const response = await api.post('/chat/ask', 
        { 
          query: queryText,
          session_id: activeSessionId 
        },
        { signal: abortControllerRef.current.signal }
      );
      const { answer, mode, sources, session_id, response_type } = response.data;
      
      const newMessage = { 
        role: 'assistant', 
        text: answer,
        mode: mode || 'general',
        response_type: response_type || 'text',
        sources: sources || []
      };

      setMessages(prev => {
        const next = [...prev, newMessage];
        setNewAssistantMessageIndex(next.length - 1);
        return next;
      });

      // If this was a new session, store the returned ID
      if (!activeSessionId && session_id) {
        setActiveSessionId(session_id);
      }
      // Always refresh sidebar to update title, preview, and timestamps
      fetchSessions();
    } catch (err) {
      if (err.name === 'CanceledError' || (err.name === 'AbortError') || (err.message && err.message.includes('abort'))) {
        info("Generation stopped by user.");
      } else {
        const msg = err.response?.data?.detail || "Connection lost. Please check your network.";
        setMessages(prev => [...prev, { role: 'assistant', text: "Error connecting to AI: " + msg }]);
        toastError("AI response failed.");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleFeedback = async (messageId, feedbackVal) => {
    if (!messageId) return;
    try {
      await api.post(`/chat/messages/${messageId}/feedback`, { feedback: feedbackVal });
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: feedbackVal } : m));
      success('Thank you for your feedback!');
    } catch (err) {
      toastError('Failed to save feedback.');
    }
  };

  return (
    <div className="flex h-[88vh] gap-6 max-w-full mx-auto my-4 px-2 relative overflow-hidden">
      {/* ── SIDEBAR (History) ────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-0 z-50 transition-all duration-500 lg:relative lg:inset-auto lg:z-10
        ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100'}
        w-[280px] shrink-0
      `}>
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="relative h-full glass dark:bg-[#050505] border-white/40 dark:border-white/5 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
          <div className="p-6">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 py-4 premium-gradient rounded-3xl text-white font-black uppercase tracking-widest text-[11px] shadow-xl interactive-scale active:scale-95 group"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
              <span>New Conversation</span>
            </button>
          </div>

          <div className="px-6 mb-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-slate-700/50 rounded-2xl text-[12px] font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 focus:border-indigo-200 dark:focus:border-indigo-800 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 custom-scrollbar">
            <div className="flex items-center gap-2 px-3 mb-2">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {searchQuery ? 'Search Results' : 'Recent Activity'}
              </span>
            </div>
            
            {sessions.length === 0 ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-4 glass rounded-3xl flex gap-3">
                    <SkeletonCircle size="2.5rem" />
                    <div className="flex-1 space-y-2">
                       <Skeleton width="60%" height="0.8rem" />
                       <Skeleton width="30%" height="0.5rem" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sessions.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="px-6 py-10 text-center space-y-3 opacity-40">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                  {searchQuery ? 'No matching chats' : 'No past conversations'}
                </p>
              </div>
            ) : (
              sessions
                .filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((s) => (
                <div
                  key={s.id}
                  onClick={() => editingId !== s.id && loadSession(s.id)}
                  className={`
                    group relative p-4 rounded-3xl cursor-pointer transition-all duration-300
                    ${activeSessionId === s.id 
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/60 ring-1 ring-indigo-100 dark:ring-indigo-900/50 shadow-md' 
                      : 'hover:bg-white/60 dark:hover:bg-slate-800/60 border border-transparent hover:border-white/80 dark:hover:border-slate-700'}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingId === s.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(s.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            onBlur={() => handleRename(s.id)}
                            className="w-full bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-800 rounded-lg px-2 py-1 text-[13px] font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button onClick={() => handleRename(s.id)} className="text-emerald-500">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 className={`text-[13px] font-black truncate pr-12 ${activeSessionId === s.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {s.title || 'New Chat'}
                          </h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 line-clamp-1 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                            {s.latest_message_preview || 'No messages yet'}
                          </p>
                        </>
                      )}
                      
                      <span className="text-[9px] text-slate-300 font-bold mt-2 inline-block">
                        {new Date(s.last_message_at).toLocaleDateString([], { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    {editingId !== s.id && (
                      <div className="absolute right-3 top-3 flex items-center gap-1">
                        <button
                          onClick={(e) => startRename(e, s)}
                          className="lg:opacity-0 group-hover:opacity-100 p-2 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-300 dark:text-slate-600 rounded-xl transition-all"
                          title="Rename"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => deleteSession(e, s.id)}
                          className="lg:opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400 text-slate-300 dark:text-slate-600 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col glass dark:bg-[#050505] rounded-[40px] shadow-2xl border-0 overflow-hidden relative">
        <div className="p-8 premium-gradient flex items-center gap-6 relative z-10 shadow-lg">
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden bg-white/20 backdrop-blur-xl p-3 rounded-2xl border border-white/30 text-white interactive-scale"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="bg-white/20 dark:bg-slate-800/40 backdrop-blur-xl p-4 rounded-3xl border border-white/30 dark:border-slate-700/50 shadow-xl interactive-scale">
             <Bot className="text-white dark:text-indigo-400 w-10 h-10" />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-black text-white tracking-tight leading-none">AI Study Assistant</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">Verified Syllabus Logic Online</p>
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-12 space-y-12 relative bg-white/30 dark:bg-slate-950/20 backdrop-blur-sm scroll-smooth"
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
             <Bot className="w-96 h-96 dark:text-indigo-400" />
          </div>
          
          {(isFetchingHistory) ? (
            <div className="space-y-10">
               {[...Array(3)].map((_, i) => (
                 <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex gap-4 max-w-[70%] ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                      <SkeletonCircle size="3.5rem" />
                      <div className={`p-8 rounded-[2.5rem] glass min-w-[200px] space-y-3 ${i % 2 === 0 ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
                        <SkeletonText lines={i === 1 ? 4 : 2} />
                      </div>
                    </div>
                 </div>
               ))}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'max-w-[75%] items-end' : 'max-w-[92%] items-start'}`}>
                  <div className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`relative w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-xl interactive-scale ${
                      msg.role === 'user' 
                        ? 'p-0 bg-white dark:bg-slate-800 ring-2 ring-indigo-200 dark:ring-indigo-900/50 overflow-visible' 
                        : 'glass dark:bg-[#0a0a0a] dark:border-white/5 text-indigo-600 dark:text-indigo-400 overflow-hidden'
                    }`}>
                      {msg.role === 'user' ? (
                         userProfile ? (
                           <>
                             <div className="w-full h-full rounded-2xl overflow-hidden">
                               <img src={resolveUserAvatar(userProfile)} alt="User" className="w-full h-full object-contain bg-white dark:bg-slate-800" onError={handleAvatarError} />
                             </div>
                             <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-[3px] border-white dark:border-slate-800 rounded-full ${getOnlineStatus(userProfile.last_seen) ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                           </>
                         ) : (
                           <div className="w-full h-full premium-gradient flex items-center justify-center text-white"><User className="w-7 h-7"/></div>
                         )
                      ) : <Bot className="w-7 h-7"/>}
                    </div>
                      <div className={`p-10 rounded-[2.8rem] text-[15.5px] font-semibold leading-[1.7] shadow-2xl animate-fade-in-up premium-hover-physics ${
                        msg.role === 'user' 
                          ? 'premium-gradient text-white rounded-tr-none border-0 shadow-indigo-200 dark:shadow-none' 
                          : msg.response_type === 'code'
                          ? 'bg-[#0d1117] text-slate-300 rounded-tl-none border border-slate-800 shadow-indigo-500/10 min-w-[320px] max-w-full'
                          : 'glass dark:bg-[#0a0a0a] text-slate-700 dark:text-slate-200 rounded-tl-none border-white/60 dark:border-white/5'
                      }`}>
                        {msg.role === 'assistant' ? (
                          <Typewriter 
                            text={msg.text} 
                            skipAnimation={idx !== newAssistantMessageIndex}
                            onComplete={() => {
                              if (idx === newAssistantMessageIndex) setNewAssistantMessageIndex(null);
                            }}
                          />
                        ) : (
                          <span className="whitespace-pre-wrap">{msg.text}</span>
                        )}
                      </div>
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="ml-20 space-y-4">
                      {msg.mode && (
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm transition-all premium-hover-physics ${
                          (msg.mode === 'document' && msg.sources?.length > 0)
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : msg.mode === 'library'
                            ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800'
                            : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                        }`}>
                          {(msg.mode === 'document' && msg.sources?.length > 0) ? (
                            <>
                              <BookOpen className="w-3 h-3" />
                              <span>Answered from uploaded materials</span>
                            </>
                          ) : msg.mode === 'library' ? (
                            <>
                              <BookOpen className="w-3 h-3" />
                              <span>Answered from library inventory</span>
                            </>
                          ) : (
                            <>
                              <Info className="w-3 h-3" />
                              <span>Answered from general knowledge</span>
                            </>
                          )}
                        </div>
                      )}

                      {msg.response_type === 'code' && (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm transition-all premium-hover-physics bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                          <Code className="w-3 h-3" />
                          <span>Gemma 2 High-Accuracy Code Runner Active</span>
                        </div>
                      )}

                      {msg.mode === 'document' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
                          <div className="flex items-center gap-2 mb-3 px-1 text-slate-400 dark:text-slate-500">
                            <FileText className="w-4 h-4" />
                            <span className="text-[11px] font-black uppercase tracking-[0.15em] opacity-80">Verified Sources</span>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            {msg.sources.map((src, sIdx) => {
                              const canNavigate = !!src.material_id;
                              const handleSourceClick = () => {
                                if (!canNavigate) return;
                                const pageParam = src.page_number ? `?page=${src.page_number}` : '';
                                const excerptParam = src.excerpt ? `&excerpt=${encodeURIComponent(src.excerpt)}` : '';
                                navigate(`/viewer/${src.material_id}${pageParam}${excerptParam}`);
                              };
                              return (
                                <div 
                                  key={sIdx}
                                  onClick={handleSourceClick}
                                  title={canNavigate ? `Open ${src.title}${src.page_number ? ` — Page ${src.page_number}` : ''}` : 'Source link unavailable'}
                                  className={`glass dark:bg-[#0a0a0a] group transition-all p-4 rounded-3xl border-white/80 dark:border-white/5 shadow-lg flex flex-col gap-1 min-w-[160px] max-w-[280px] premium-hover-physics pointer-events-auto ${
                                    canNavigate
                                      ? 'cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-indigo-100 dark:hover:shadow-none hover:ring-2 hover:ring-indigo-100 dark:hover:ring-indigo-900/50'
                                      : 'cursor-not-allowed opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                      {src.title}
                                    </span>
                                    {canNavigate && (
                                      <ExternalLink className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                                    {src.page_number && (
                                      <span className="bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase tracking-tighter">
                                         PG {src.page_number}
                                      </span>
                                    )}
                                    <span className="truncate opacity-70 italic">{src.source_file}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Feedback Buttons */}
                      {idx > 0 && typeof msg.id !== 'undefined' && !msg.feedback && (
                         <div className="flex items-center gap-3 mt-4 px-2 translate-y-1">
                           <button
                             title="Helpful"
                             onClick={() => handleFeedback(msg.id, 'helpful')}
                             className="p-2 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                           >
                             <ThumbsUp className="w-4 h-4" />
                           </button>
                           <button
                             title="Not Helpful"
                             onClick={() => handleFeedback(msg.id, 'not_helpful')}
                             className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                           >
                             <ThumbsDown className="w-4 h-4" />
                           </button>
                         </div>
                      )}
                      {msg.feedback && (
                         <div className="flex items-center gap-2 mt-4 px-2">
                           {msg.feedback === 'helpful' ? (
                             <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1"><ThumbsUp className="w-3 h-3"/> You found this helpful</span>
                           ) : (
                             <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1"><ThumbsDown className="w-3 h-3"/> You found this unhelpful</span>
                           )}
                         </div>
                      )}
                      
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {loading && (
            <div className="flex justify-start relative z-10">
               <div className="flex gap-6">
                  <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center glass dark:bg-slate-900 dark:border-slate-800">
                     <Bot className="w-7 h-7 text-indigo-600 dark:text-indigo-400"/>
                  </div>
                  <div className="p-10 rounded-[2.5rem] glass dark:bg-slate-900 dark:border-slate-800 rounded-tl-none flex flex-col items-center justify-center min-w-[320px] min-h-[180px] overflow-hidden relative group">
                    <BrainLoader message="Synthesizing Knowledge..." subtext="Neural Engine Active" />
                    <button 
                      onClick={handleStopGeneration}
                      className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all active:scale-95 text-xs font-black uppercase tracking-widest group/btn"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Generating</span>
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-t border-white/40 dark:border-slate-800 relative z-10">
          <form onSubmit={handleSend} className="relative flex items-center w-full group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your academic question here..."
              className="w-full pl-8 pr-24 py-6 bg-white/80 dark:bg-slate-800/80 glass dark:bg-slate-900 rounded-[2.5rem] text-base font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all border-0 shadow-2xl dark:shadow-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-4 p-5 premium-gradient rounded-3xl hover:shadow-indigo-300 dark:hover:shadow-none disabled:opacity-50 transition-all shadow-xl dark:shadow-none active:scale-95"
            >
              <Send className="w-6 h-6 text-white" />
            </button>
          </form>
          <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-4 opacity-50">
            AI generated answers should be verified with official course materials
          </p>
        </div>
      </main>
    </div>
  );
}
