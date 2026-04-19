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
  mode: 'general',
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
    <div className="flex h-[85vh] gap-4 max-w-[1600px] mx-auto my-4 px-4 relative overflow-hidden">
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

        <div className="relative h-full glass rounded-[40px] flex flex-col overflow-hidden border-white/40 shadow-2xl">
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
                className="w-full pl-11 pr-4 py-3 bg-white/50 border border-white/60 rounded-2xl text-[12px] font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 transition-all"
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
            
            {sessions.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
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
                      ? 'bg-indigo-50 border-indigo-100 ring-1 ring-indigo-100 shadow-md' 
                      : 'hover:bg-white/60 border border-transparent hover:border-white/80'}
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
                            className="w-full bg-white border border-indigo-300 rounded-lg px-2 py-1 text-[13px] font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button onClick={() => handleRename(s.id)} className="text-emerald-500">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 className={`text-[13px] font-black truncate pr-12 ${activeSessionId === s.id ? 'text-indigo-600' : 'text-slate-800'}`}>
                            {s.title || 'New Chat'}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 line-clamp-1 group-hover:text-slate-500 transition-colors">
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
                          className="lg:opacity-0 group-hover:opacity-100 p-2 hover:bg-indigo-100 hover:text-indigo-600 text-slate-300 rounded-xl transition-all"
                          title="Rename"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => deleteSession(e, s.id)}
                          className="lg:opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 hover:text-red-500 text-slate-300 rounded-xl transition-all"
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
      <main className="flex-1 flex flex-col glass rounded-[40px] shadow-2xl border-0 overflow-hidden relative">
        <div className="p-8 premium-gradient flex items-center gap-6 relative z-10 shadow-lg">
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden bg-white/20 backdrop-blur-xl p-3 rounded-2xl border border-white/30 text-white interactive-scale"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="bg-white/20 backdrop-blur-xl p-4 rounded-3xl border border-white/30 shadow-xl interactive-scale">
             <Bot className="text-white w-10 h-10" />
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
          className="flex-1 overflow-y-auto p-10 space-y-10 relative bg-white/30 backdrop-blur-sm scroll-smooth"
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
             <Bot className="w-96 h-96" />
          </div>
          
          {(isFetchingHistory) ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-40">
              <Bot className="w-16 h-16 text-indigo-400 animate-bounce" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Retrieving History...</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`relative w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-xl interactive-scale ${
                      msg.role === 'user' 
                        ? 'p-0 bg-white ring-2 ring-indigo-200 overflow-visible' 
                        : 'glass text-indigo-600 overflow-hidden'
                    }`}>
                      {msg.role === 'user' ? (
                         userProfile ? (
                           <>
                             <div className="w-full h-full rounded-2xl overflow-hidden">
                               <img src={resolveUserAvatar(userProfile)} alt="User" className="w-full h-full object-contain bg-white" onError={handleAvatarError} />
                             </div>
                             <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-[3px] border-white rounded-full ${getOnlineStatus(userProfile.last_seen) ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                           </>
                         ) : (
                           <div className="w-full h-full premium-gradient flex items-center justify-center text-white"><User className="w-7 h-7"/></div>
                         )
                      ) : <Bot className="w-7 h-7"/>}
                    </div>
                    <div className={`p-8 rounded-[2.5rem] text-[15px] font-semibold leading-relaxed shadow-xl ${
                      msg.role === 'user' 
                        ? 'premium-gradient text-white rounded-tr-none border-0 shadow-indigo-200' 
                        : 'glass text-slate-700 rounded-tl-none border-white/60'
                    }`}>
                      {msg.text}
                    </div>
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="ml-20 space-y-4">
                      {msg.mode && (
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md shadow-sm transition-all ${
                          msg.mode === 'document'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : msg.mode === 'library'
                            ? 'bg-teal-50 text-teal-600 border-teal-200'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                        }`}>
                          {msg.mode === 'document' ? (
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

                      {msg.mode === 'document' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
                          <div className="flex items-center gap-2 mb-3 px-1 text-slate-400">
                            <FileText className="w-4 h-4" />
                            <span className="text-[11px] font-black uppercase tracking-[0.15em]">Verified Sources</span>
                          </div>
                          <div className="flex flex-wrap gap-3">
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
                                  className={`glass group transition-all p-4 rounded-3xl border-white/80 shadow-lg flex flex-col gap-1 min-w-[160px] max-w-[280px] interactive-scale pointer-events-auto ${
                                    canNavigate
                                      ? 'cursor-pointer hover:bg-indigo-50/60 hover:border-indigo-200 hover:shadow-indigo-100 hover:ring-2 hover:ring-indigo-100'
                                      : 'cursor-not-allowed opacity-60'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                      {src.title}
                                    </span>
                                    {canNavigate && (
                                      <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                                    {src.page_number && (
                                      <span className="bg-indigo-50 px-2 py-0.5 rounded-lg text-indigo-600 border border-indigo-100 uppercase tracking-tighter">
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
                 <div className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center glass">
                    <Bot className="w-7 h-7 text-indigo-600 animate-pulse"/>
                 </div>
                 <div className="p-8 rounded-[2.5rem] glass rounded-tl-none flex items-center gap-3">
                   <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce shadow-sm"></div>
                   <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce delay-75 shadow-sm"></div>
                   <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce delay-150 shadow-sm"></div>
                 </div>
               </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-white/50 backdrop-blur-md border-t border-white/40 relative z-10">
          <form onSubmit={handleSend} className="relative flex items-center w-full group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your academic question here..."
              className="w-full pl-8 pr-24 py-6 bg-white/80 glass rounded-[2.5rem] text-base font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all border-0 shadow-2xl"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-4 p-5 premium-gradient rounded-3xl hover:shadow-indigo-300 disabled:opacity-50 transition-all shadow-xl active:scale-95"
            >
              <Send className="w-6 h-6 text-white" />
            </button>
          </form>
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 opacity-50">
            AI generated answers should be verified with official course materials
          </p>
        </div>
      </main>
    </div>
  );
}
