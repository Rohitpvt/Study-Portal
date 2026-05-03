import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  LogOut, 
  ShieldCheck, 
  Star, 
  LayoutDashboard, 
  Bot, 
  UploadCloud,
  Info,
  Mail,
  ChevronDown,
  Settings,
  Sun,
  Moon,
  LogIn,
  Crown,
  Bell,
  GraduationCap,
  Wrench
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { resolveUserAvatar, getOnlineStatus, handleAvatarError } from '../../utils/avatarUtils';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { userProfile } = useAuth();
  const { info, error } = useNotification();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  
  const token = localStorage.getItem('access_token');
  const moreRef = useRef(null);
  const roleRef = useRef(null);
  const profileRef = useRef(null);

  // ── Admin Alert Badge State Removed (Using Global NotificationBell) ────────

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      info("Connection restored. Syncing session...");
    };
    const handleOffline = () => {
      setIsOnline(false);
      error("You appear to be offline. Some features may be unavailable.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [info, error]);

  // ── Throttled Scroll Handling ──────────────────────────────────────────────
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Click Outside Handling ──────────────────────────────────────────────────
  const handleClickOutside = useCallback((event) => {
    if (moreRef.current && !moreRef.current.contains(event.target)) setIsMoreOpen(false);
    if (roleRef.current && !roleRef.current.contains(event.target)) setIsRoleOpen(false);
    if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    info("Cloud session synchronized and terminated.");
    navigate('/login');
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  };

  const authPages = ['/login', '/register'];
  if (authPages.includes(location.pathname)) return null;

  const isLoggedIn = !!(token && userProfile);

  const isAdmin = userProfile && ['admin', 'developer'].includes(userProfile.role?.toLowerCase());
  const isDeveloper = userProfile && userProfile.role?.toLowerCase() === 'developer';
  const isStudentOrTeacher = userProfile && ['student', 'teacher'].includes(userProfile.role?.toLowerCase());

  // ── Safe Route Highlighting Logic ───────────────────────────────────────────
  const isActiveRoute = (path) => {
    if (path === '/classrooms') return location.pathname.startsWith('/classrooms');
    if (path === '/materials') return location.pathname.startsWith('/materials') || location.pathname.startsWith('/viewer');
    if (path === '/admin') return location.pathname.startsWith('/admin');
    if (path === '/profile-control') return location.pathname.startsWith('/profile-control');
    if (path === '/contributions') return location.pathname.startsWith('/contributions');
    if (path === '/chat') return location.pathname.startsWith('/chat');
    
    // Exact matching for others (Dashboard, Contact, About, etc.)
    return location.pathname === path;
  };

  // ── Link Groupings (Desktop) ────────────────────────────────────────────────
  const primaryLinks = isLoggedIn ? [
    { to: '/dashboard', label: 'Terminal', icon: LayoutDashboard },
    { to: '/classrooms', label: 'Classrooms', icon: GraduationCap },
    { to: '/materials', label: 'Library', icon: BookOpen },
    { to: '/chat', label: 'Research AI', icon: Bot },
  ] : [];

  // Contribute visible to Student/Teacher (Admins have direct upload in Library)
  if (isLoggedIn && isStudentOrTeacher) {
    primaryLinks.push({ to: '/contributions', label: 'Contribute', icon: UploadCloud });
  }

  const moreLinks = [
    ...(isLoggedIn ? [{ to: '/favorites', label: 'Favorites', icon: Star }] : []),
    { to: '/about', label: 'About Us', icon: Info },
    { to: '/contact', label: 'Contact Us', icon: Mail }
  ];

  const roleLinks = [
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
    ...(isDeveloper ? [{ to: '/profile-control', label: 'Profile Control', icon: Crown }] : [])
  ];

  // ── Link Groupings (Mobile Drawer) ──────────────────────────────────────────
  const mobileMainLinks = isLoggedIn ? [
    { to: '/dashboard', label: 'Terminal', icon: LayoutDashboard },
    { to: '/chat', label: 'Research AI', icon: Bot },
  ] : [];

  const mobileLearningLinks = isLoggedIn ? [
    { to: '/classrooms', label: 'Classrooms', icon: GraduationCap },
    { to: '/materials', label: 'Library', icon: BookOpen },
    ...(isStudentOrTeacher ? [{ to: '/contributions', label: 'Contribute', icon: UploadCloud }] : []),
    { to: '/favorites', label: 'Favorites', icon: Star },
  ] : [];

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-500 ease-in-out ${
          isScrolled 
            ? "glass-nav h-16" 
            : "bg-white/0 h-24"
        }`}
      >
        {/* max-w-[1400px] to allow slightly more room for 5 center links without crowding */}
        <div className="max-w-[1400px] mx-auto h-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-full">
            
            {/* LEFT: Brand Section */}
            <div className="flex items-center min-w-[150px]">
              <Link to="/dashboard" className="flex items-center text-2xl font-black text-slate-900 dark:text-white tracking-tighter gap-2 hover:opacity-80 transition-opacity">
                <span className="premium-gradient rounded-xl w-10 h-10 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white text-base shrink-0">CU</span>
                <span className={`bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 hidden lg:inline transition-all duration-300 ${isScrolled ? 'scale-90 opacity-90' : 'scale-100'}`}>Portal</span>
              </Link>
            </div>

            {/* CENTER: Primary Navigation */}
            <div className="hidden xl:flex items-center h-full gap-1 justify-center flex-1 px-4">
              {primaryLinks.map((link) => {
                const isActive = isActiveRoute(link.to);
                return (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    className={`relative flex items-center h-full px-3 2xl:px-4 text-sm font-bold tracking-tight transition-all duration-300 gap-2 group whitespace-nowrap ${
                      isActive 
                        ? "text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <link.icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "opacity-60"}`} /> 
                    <span>{link.label}</span>
                    {isActive && <div className="active-link-indicator" />}
                  </Link>
                );
              })}

              {/* MORE Dropdown */}
              <div className="relative h-full flex items-center ml-1" ref={moreRef}>
                <button
                  onClick={() => { setIsMoreOpen(!isMoreOpen); setIsRoleOpen(false); setIsProfileOpen(false); }}
                  className={`flex items-center px-3 py-2 rounded-xl text-sm font-bold transition-all duration-300 gap-1.5 ${
                    isMoreOpen ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-black/40"
                  }`}
                >
                  More <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isMoreOpen ? "rotate-180" : ""}`} />
                </button>

                {isMoreOpen && (
                  <div className="absolute top-[80%] right-0 mt-3 w-48 glass rounded-2xl p-2 shadow-2xl border border-white/20 dark:border-white/5 animate-in fade-in slide-in-from-top-3 duration-300 origin-top-right z-[100]">
                    {moreLinks.map((link) => {
                      const isMoreActive = isActiveRoute(link.to);
                      return (
                        <Link 
                          key={link.to}
                          to={link.to} 
                          onClick={() => setIsMoreOpen(false)}
                          className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 gap-3 ${
                            isMoreActive 
                              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <link.icon className={`w-4 h-4 ${isMoreActive ? '' : 'opacity-60'}`} /> 
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ROLE TOOLS Dropdown */}
              {roleLinks.length > 0 && (
                <div className="relative h-full flex items-center ml-1" ref={roleRef}>
                  <button
                    onClick={() => { setIsRoleOpen(!isRoleOpen); setIsMoreOpen(false); setIsProfileOpen(false); }}
                    className={`flex items-center px-3 py-2 rounded-xl text-sm font-bold transition-all duration-300 gap-1.5 ${
                      isRoleOpen ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-black/40"
                    }`}
                  >
                    <Wrench className="w-4 h-4 opacity-70" />
                    Tools <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isRoleOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isRoleOpen && (
                    <div className="absolute top-[80%] right-0 mt-3 w-52 glass rounded-2xl p-2 shadow-2xl border border-white/20 dark:border-white/5 animate-in fade-in slide-in-from-top-3 duration-300 origin-top-right z-[100]">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/50 mb-1">
                         <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">System Management</span>
                      </div>
                      {roleLinks.map((link) => {
                        const isRoleActive = isActiveRoute(link.to);
                        return (
                          <Link 
                            key={link.to}
                            to={link.to} 
                            onClick={() => setIsRoleOpen(false)}
                            className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 gap-3 ${
                              isRoleActive 
                                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <link.icon className={`w-4 h-4 ${isRoleActive ? '' : 'opacity-60'}`} /> 
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: User Section */}
            <div className="flex items-center gap-2 lg:gap-3 min-w-[150px] justify-end">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-amber-400 hover:rotate-12 hover:scale-110 transition-all duration-300 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hidden sm:flex"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 fill-current" /> : <Moon className="w-5 h-5 fill-current" />}
              </button>

              {/* Network Status Dot */}
              {!isOnline && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-500/20 animate-pulse hidden md:flex">
                  <div className="w-2 h-2 bg-rose-500 rounded-full" />
                  <span className="hidden lg:inline">Offline</span>
                </div>
              )}

              {/* Classroom/User Notification Bell (Has its own dropdown, ensure z-index safety) */}
              {isLoggedIn && <NotificationBell />}

              {!isLoggedIn && (
                <Link 
                  to="/login"
                  className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  <LogIn className="w-4 h-4" /> Sign In
                </Link>
              )}

              {userProfile && (
                <div className="relative" ref={profileRef}>
                  <button 
                    onClick={() => { setIsProfileOpen(!isProfileOpen); setIsMoreOpen(false); setIsRoleOpen(false); }}
                    className="group hidden md:flex items-center gap-3 bg-white/40 dark:bg-black/40 border border-slate-200/50 dark:border-white/5 pl-1.5 pr-4 py-1.5 rounded-2xl hover:bg-white dark:hover:bg-[#0a0a0a] hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
                  >
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5 shrink-0 group-hover:ring-2 ring-indigo-500/20 transition-all">
                      <img src={resolveUserAvatar(userProfile)} alt="Avatar" className="w-full h-full object-contain" onError={handleAvatarError} />
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white dark:border-slate-800 rounded-full ${getOnlineStatus(userProfile.last_seen) ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                    </div>
                    <div className="flex flex-col text-left hidden lg:flex">
                      <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-[110px] leading-none mb-1">
                        {userProfile?.display_name || userProfile?.full_name?.split(' ')[0]}
                      </span>
                      <span className="text-[9px] uppercase font-black tracking-widest text-indigo-500 dark:text-indigo-400 leading-none opacity-80">
                        {userProfile?.role?.toUpperCase() === 'DEVELOPER' ? '⚡ DEVELOPER' : userProfile?.role?.toUpperCase() === 'ADMIN' ? 'SYS ADMIN' : userProfile?.role?.toUpperCase() === 'TEACHER' ? '📚 TEACHER' : 'STUDENT'}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-500 ${isProfileOpen ? "rotate-180" : ""} hidden lg:block`} />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute top-[80%] right-0 mt-3 w-60 glass rounded-2xl p-2 shadow-2xl border border-white/20 dark:border-slate-800 animate-in fade-in slide-in-from-top-3 duration-300 origin-top-right z-[100]">
                      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-700/50 mb-1.5 rounded-t-xl bg-slate-50/50 dark:bg-slate-900/50">
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-2">Connected Profile</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{userProfile?.email}</p>
                      </div>
                      <Link 
                        to="/profile" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all gap-3"
                      >
                        <Settings className="w-4 h-4 opacity-60" /> Account Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all gap-3 mt-1"
                      >
                        <LogOut className="w-4 h-4 opacity-60" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`xl:hidden w-11 h-11 flex flex-col items-center justify-center gap-1.5 glass rounded-xl transition-all active:scale-90 ${isMobileMenuOpen ? 'hamburger-active' : ''}`}
                aria-label="Menu"
              >
                <div className="hamburger-line" />
                <div className="hamburger-line" />
                <div className="hamburger-line" />
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <div className={`fixed inset-0 z-[110] transition-all duration-500 overflow-hidden ${isMobileMenuOpen ? 'visible' : 'invisible pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-500 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
        
        {/* Panel */}
        <div className={`absolute inset-y-0 right-0 w-[85%] max-w-[340px] bg-white dark:bg-[#050505] shadow-2xl transition-transform duration-500 ease-out border-l border-white/10 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="h-20 flex items-center justify-between px-6 border-b border-slate-50 dark:border-slate-800/50 shrink-0">
            <div className="flex flex-col">
               <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">CU PORTAL</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <div className="hamburger-active">
                <div className="hamburger-line rotate-45 translate-y-[2px]" />
                <div className="hamburger-line -rotate-45 -translate-y-[2px]" />
              </div>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-hide">
            
            {/* MAIN SECTION */}
            {mobileMainLinks.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 px-1">Main</p>
                <div className="space-y-1">
                  {mobileMainLinks.map((link) => {
                    const isActive = isActiveRoute(link.to);
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <link.icon className={`w-5 h-5 mr-4 ${isActive ? 'text-white' : 'opacity-60'}`} /> {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LEARNING SECTION */}
            {mobileLearningLinks.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 px-1">Learning</p>
                <div className="space-y-1">
                  {mobileLearningLinks.map((link) => {
                    const isActive = isActiveRoute(link.to);
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                          isActive
                            ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <link.icon className={`w-5 h-5 mr-4 ${isActive ? '' : 'opacity-60'}`} /> {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUPPORT SECTION */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3 px-1">Support</p>
              <div className="space-y-1">
                {moreLinks.filter(l => l.label !== 'Favorites').map((link) => {
                  const isActive = isActiveRoute(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <link.icon className={`w-5 h-5 mr-4 ${isActive ? '' : 'opacity-60'}`} /> {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* ROLE TOOLS SECTION */}
            {roleLinks.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80 mb-3 px-1">Role Tools</p>
                <div className="space-y-1">
                  {roleLinks.map((link) => {
                    const isActive = isActiveRoute(link.to);
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                          isActive
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <link.icon className={`w-5 h-5 mr-4 ${isActive ? '' : 'opacity-60'}`} /> {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Bottom spacer for safe scrolling above the fixed footer */}
            <div className="h-4" />
          </div>
          
          {/* ACCOUNT FOOTER SECTION (Fixed at bottom) */}
          <div className="p-5 border-t border-slate-50 dark:border-slate-800/50 bg-slate-50/80 dark:bg-[#0a0a0a] shrink-0">
             {isLoggedIn ? (
               <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-3 px-1">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm shrink-0">
                       <img src={resolveUserAvatar(userProfile)} alt="Avatar" className="w-full h-full object-contain" onError={handleAvatarError} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                       <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{userProfile?.display_name || userProfile?.full_name?.split(' ')[0]}</span>
                       <span className="text-[9px] uppercase font-black text-indigo-500 tracking-widest truncate">{userProfile?.role?.toUpperCase() === 'TEACHER' ? 'Faculty Member' : 'Verified User'}</span>
                    </div>
                    <button onClick={toggleTheme} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-amber-400 shrink-0 shadow-sm">
                      {theme === 'dark' ? <Sun className="w-4 h-4 fill-current" /> : <Moon className="w-4 h-4 fill-current" />}
                    </button>
                 </div>
                 <div className="grid grid-cols-2 gap-2 mt-1">
                   <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-widest transition-all gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm">
                     <Settings className="w-3.5 h-3.5" /> Profile
                   </Link>
                   <button onClick={handleLogout} className="flex items-center justify-center py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black uppercase tracking-widest transition-all gap-2 hover:bg-red-100 dark:hover:bg-red-900/40">
                     <LogOut className="w-3.5 h-3.5" /> Sign Out
                   </button>
                 </div>
               </div>
             ) : (
               <Link
                 to="/login"
                 onClick={() => setIsMobileMenuOpen(false)}
                 className="w-full h-12 flex items-center justify-center rounded-2xl bg-indigo-600 text-white text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
               >
                 <LogIn className="w-4 h-4 mr-2" /> Sign In to Portal
               </Link>
             )}
          </div>
        </div>
      </div>
    </>
  );
}
