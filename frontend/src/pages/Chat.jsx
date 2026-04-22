import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Send, Bot, User, BookOpen, FileText, Info, ExternalLink, Plus, MessageSquare, Menu, X, Trash2, Clock, Search, Edit3, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { resolveUserAvatar, getOnlineStatus, handleAvatarError } from '../utils/avatarUtils';

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
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const { userProfile } = useAuth();
  
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
      const response = await api.get(`/chat/sessions/${sessionId}`);
      const { messages: historyMessages } = response.data;
      
      // Map backend messages to frontend format
      const formatted = historyMessages.map(m => ({
        role: m.role,
        text: m.content,
        mode: m.mode || 'general',
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
      const response = await api.post('/chat/ask', { 
        query: queryText,
        session_id: activeSessionId 
      });
      const { answer, mode, sources, session_id } = response.data;
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: answer,
        mode: mode || 'general',
        sources: sources || []
      }]);

      // If this was a new session, store the returned ID
      if (!activeSessionId && session_id) {
        setActiveSessionId(session_id);
      }
      // Always refresh sidebar to update title, preview, and timestamps
      fetchSessions();
    } catch (err) {
      const msg = err.response?.data?.detail || "Connection lost. Please check your network.";
      setMessages(prev => [...prev, { role: 'assistant', text: "Error connecting to AI: " + msg }]);
      toastError("AI response failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[85vh] gap-6 max-w-[1700px] mx-auto my-6 px-6 relative overflow-hidden">
      {/* ── SIDEBAR (History) ────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-0 z-50 transition-all duration-500 lg:relative lg:inset-auto lg:z-10
        ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100'}
        w-[300px] shrink-0
      `}>
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="relative h-full saas-card dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl dark:shadow-none">
          <div className="p-6">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 py-4 premium-gradient rounded-2xl text-white font-black uppercase tracking-widest text-[11px] shadow-xl interactive-scale group"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              <span>New Conversation</span>
            </button>
          </div>

          <div className="px-6 mb-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter history..."
                className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-[12px] font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 custom-scrollbar">
            <div className="flex items-center gap-2 px-4 mb-4">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                {searchQuery ? 'Search Results' : 'Archived Dialogues'}
              </span>
            </div>
            
            {sessions.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="px-6 py-12 text-center space-y-4 opacity-30">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {searchQuery ? 'No matching logs' : 'Journal Empty'}
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
                    group relative p-4 rounded-2xl cursor-pointer transition-all duration-300
                    ${activeSessionId === s.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
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
                            className="w-full bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg px-2 py-1 text-[13px] font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <>
                          <h4 className={`text-[13px] font-black truncate pr-10 ${activeSessionId === s.id ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                            {s.title || 'New Chat'}
                          </h4>
                          <p className={`text-[10px] font-bold mt-1 line-clamp-1 opacity-70 ${activeSessionId === s.id ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                            {s.latest_message_preview || 'Ready for query'}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="absolute right-3 top-4 flex items-center gap-1">
                      <button
                        onClick={(e) => startRename(e, s)}
                        className={`p-2 rounded-lg transition-all ${activeSessionId === s.id ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600'}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => deleteSession(e, s.id)}
                        className={`p-2 rounded-lg transition-all ${activeSessionId === s.id ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col saas-card dark:bg-[#0b1120] rounded-[3rem] shadow-2xl dark:shadow-none border-slate-200 dark:border-slate-800/50 overflow-hidden relative">
        <div className="px-10 py-8 glass dark:bg-slate-900/60 border-0 border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 relative z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-xl shadow-indigo-500/20">
             <Bot className="text-white w-8 h-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">Research Intelligence</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">FAISS Knowledge Core Active</p>
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-10 space-y-12 relative bg-slate-50/30 dark:bg-transparent scroll-smooth"
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.02] dark:opacity-[0.04] pointer-events-none">
             <Bot className="w-[500px] h-[500px] text-slate-900 dark:text-indigo-400" />
          </div>
          
          {(isFetchingHistory) ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 dark:text-indigo-400">Syncing Conversations</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`flex flex-col gap-4 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`relative w-12 h-12 shrink-0 rounded-xl flex items-center justify-center shadow-xl ${
                      msg.role === 'user' 
                        ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700' 
                        : 'premium-gradient'
                    }`}>
                      {msg.role === 'user' ? (
                         userProfile ? (
                           <div className="w-full h-full rounded-xl overflow-hidden p-0.5">
                             <img src={resolveUserAvatar(userProfile)} alt="User" className="w-full h-full object-contain rounded-lg" onError={handleAvatarError} />
                           </div>
                         ) : (
                           <User className="w-6 h-6 text-slate-400"/>
                         )
                      ) : <Bot className="w-6 h-6 text-white"/>}
                    </div>
                      <div className={`p-8 rounded-[2.5rem] text-[15px] font-bold leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'premium-gradient text-white rounded-tr-none' 
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-800 shadow-xl'
                      }`}>
                        {msg.text.split(/```/).map((part, i) => {
                          if (i % 2 === 1) {
                            const lines = part.trim().split('\n');
                            const lang = lines[0].length < 15 ? lines[0] : '';
                            const code = lang ? lines.slice(1).join('\n') : part;
                            
                            return (
                              <div key={i} className="my-6 relative group">
                                {lang && (
                                  <div className="absolute right-4 top-0 -translate-y-1/2 bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-500 shadow-lg">
                                    {lang}
                                  </div>
                                )}
                                <pre className="bg-slate-950 dark:bg-black text-indigo-300 p-8 rounded-[2rem] overflow-x-auto font-mono text-[13px] border border-white/5 dark:border-white/10 shadow-2xl custom-scrollbar-horizontal">
                                  <code>{code.trim()}</code>
                                </pre>
                              </div>
                            );
                          }
                          return <span key={i} className="whitespace-pre-wrap">{part}</span>;
                        })}
                      </div>
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="ml-18 space-y-6">
                      {msg.mode && (
                        <div className={`inline-flex items-center gap-3 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm transition-all ${
                          (msg.mode === 'document' && msg.sources?.length > 0)
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : msg.mode === 'library'
                            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                        }`}>
                          {(msg.mode === 'document' && msg.sources?.length > 0) ? (
                            <>
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Grounding: Verified Materials</span>
                            </>
                          ) : msg.mode === 'library' ? (
                            <>
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Grounding: Inventory Data</span>
                            </>
                          ) : (
                            <>
                              <Info className="w-3.5 h-3.5" />
                              <span>Fallback: General Knowledge</span>
                            </>
                          )}
                        </div>
                      )}

                      {msg.mode === 'document' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 animate-in fade-in slide-in-from-left-4 duration-700">
                          <div className="flex items-center gap-2 mb-4 px-2 text-slate-400 dark:text-slate-500">
                            <FileText className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Source Nodes</span>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            {msg.sources.map((src, sIdx) => {
                              const canNavigate = !!src.material_id;
                              return (
                                <div 
                                  key={sIdx}
                                  onClick={() => canNavigate && navigate(`/viewer/${src.material_id}${src.page_number ? `?page=${src.page_number}` : ''}${src.excerpt ? `&excerpt=${encodeURIComponent(src.excerpt)}` : ''}`)}
                                  className={`saas-card dark:bg-slate-900 group transition-all p-5 rounded-[2rem] border-slate-200 dark:border-slate-800 shadow-md flex flex-col gap-2 min-w-[180px] max-w-[300px] interactive-scale ${
                                    canNavigate ? 'cursor-pointer hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-xl' : 'opacity-60 cursor-not-allowed'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight">
                                      {src.title}
                                    </span>
                                    {canNavigate && <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />}
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                                    {src.page_number && (
                                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                         PAGE {src.page_number}
                                      </span>
                                    )}
                                    <span className="truncate max-w-[100px]">{src.source_file}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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
               <div className="flex gap-6 items-center">
                 <div className="w-12 h-12 shrink-0 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                    <Bot className="w-6 h-6 text-white animate-pulse"/>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
                   <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                   <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                 </div>
               </div>
            </div>
          )}
        </div>

        <div className="px-10 py-10 bg-white dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 relative z-10 backdrop-blur-md">
          <form onSubmit={handleSend} className="relative flex items-center w-full group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Synthesize information from your syllabus..."
              className="w-full pl-10 pr-24 py-7 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] text-base font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-4 p-5 premium-gradient rounded-[1.5rem] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-indigo-600/20"
            >
              <Send className="w-6 h-6 text-white" />
            </button>
          </form>
          <p className="text-center text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] mt-6">
            RAG-Augmented Intelligent Synthesis — Christ University Academic Core
          </p>
        </div>
      </main>
    </div>
  );
}
