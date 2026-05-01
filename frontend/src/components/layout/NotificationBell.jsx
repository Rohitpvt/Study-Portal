import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, MessageSquare, BookOpen, AlertCircle, Sparkles, ChevronRight, Inbox, X } from 'lucide-react';
import api from '../../services/api';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/notifications/summary');
      setUnreadCount(res.data.unread_count);
      setNotifications(res.data.latest_notifications);
    } catch (err) {
      console.error("Failed to fetch notification summary", err);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [fetchSummary]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) fetchSummary();
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  };

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read) await markRead(n.id);
    setIsOpen(false);
    if (n.link_url) navigate(n.link_url);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'classroom_announcement': return <Sparkles size={14} className="text-indigo-500" />;
      case 'assignment_created': return <BookOpen size={14} className="text-blue-500" />;
      case 'assignment_due_soon': return <AlertCircle size={14} className="text-rose-500" />;
      case 'assignment_graded': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'assignment_returned': return <Inbox size={14} className="text-amber-500" />;
      case 'private_doubt_reply': return <MessageSquare size={14} className="text-indigo-500" />;
      default: return <Bell size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={toggleDropdown}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 transition-all duration-300 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        title="Notifications"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-wiggle' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-black px-1 shadow-lg shadow-indigo-500/30 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute inset-0 sm:inset-auto sm:top-[80%] sm:right-0 mt-0 sm:mt-3 w-full sm:w-80 h-full sm:h-auto glass sm:rounded-2xl shadow-2xl border-0 sm:border border-white/20 dark:border-white/5 animate-in fade-in slide-in-from-bottom-5 sm:slide-in-from-top-3 duration-300 origin-bottom sm:origin-top-right overflow-hidden z-[100]">
          {/* Mobile Header / Top Bar */}
          <div className="sm:hidden h-16 flex items-center justify-between px-6 border-b border-white/10 bg-slate-900/50">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Alert Center</h3>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-white">
              <X size={24} />
            </button>
          </div>

          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-[9px] font-black text-indigo-500 hover:text-indigo-400 uppercase tracking-widest transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 flex items-start gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer group relative ${!n.is_read ? 'bg-indigo-500/[0.02]' : ''}`}
                  >
                    {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                    <div className="mt-1 w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-black leading-tight mb-1 truncate ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                        {n.title}
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">
                        {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 opacity-40">
                  <Bell size={20} className="text-slate-400" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No notifications yet</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/5 text-center bg-white/[0.01]">
            <button 
              onClick={() => { setIsOpen(false); navigate('/notifications'); }}
              className="text-[9px] font-black text-slate-400 hover:text-indigo-500 uppercase tracking-widest transition-colors"
            >
              See all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
