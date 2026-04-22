import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  LogOut, 
  ShieldCheck, 
  Star, 
  User as UserIcon, 
  LayoutDashboard, 
  Bot, 
  UploadCloud,
  Info,
  Mail,
  ChevronDown,
  Settings,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import { resolveUserAvatar, getOnlineStatus, handleAvatarError } from '../../utils/avatarUtils';

export default function Navbar() {
  const { userProfile } = useAuth();
  const { info } = useNotification();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const token = localStorage.getItem('access_token');
  const moreRef = useRef(null);
  const profileRef = useRef(null);

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
  if (!token || !userProfile || authPages.includes(location.pathname)) return null;

  const isAdmin = userProfile && userProfile.role?.toLowerCase() === 'admin';

  const primaryLinks = [
    { to: '/dashboard', label: 'Terminal', icon: LayoutDashboard },
    { to: '/materials', label: 'Library', icon: BookOpen },
    { to: '/chat', label: 'Research AI', icon: Bot },
  ];

  if (!isAdmin) {
    primaryLinks.push({ to: '/contributions', label: 'Contribute', icon: UploadCloud });
  } else {
    primaryLinks.push({ to: '/admin', label: 'Admin Panel', icon: ShieldCheck });
  }

  const secondaryLinks = [
    { to: '/favorites', label: 'Favorites', icon: Star },
    { to: '/about', label: 'About Us', icon: Info },
    { to: '/contact', label: 'Contact Us', icon: Mail },
  ];

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
          isScrolled 
            ? "glass-nav h-16" 
            : "bg-white/0 h-24"
        }`}
      >
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-full">
            
            {/* LEFT: Brand Section */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center text-2xl font-black text-slate-900 dark:text-white tracking-tighter gap-2 hover:opacity-80 transition-opacity">
                <span className="premium-gradient rounded-xl w-10 h-10 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white text-base">CU</span>
                <span className={`bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 hidden sm:inline transition-all duration-300 ${isScrolled ? 'scale-90 opacity-90' : 'scale-100'}`}>Portal</span>
              </Link>
            </div>

            {/* CENTER: Primary Navigation */}
            <div className="hidden lg:flex items-center h-full gap-2">
              {primaryLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    className={`relative flex items-center h-full px-5 text-sm font-bold tracking-tight transition-all duration-300 gap-2.5 group ${
                      isActive 
                        ? "text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <link.icon className={`w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "opacity-60"}`} /> 
                    <span>{link.label}</span>
                    {isActive && <div className="active-link-indicator" />}
                  </Link>
                );
              })}

              {/* MORE Dropdown */}
              <div className="relative h-full flex items-center ml-2" ref={moreRef}>
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className={`flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 gap-2 ${
                    isMoreOpen ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-black/40"
                  }`}
                >
                  More <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMoreOpen ? "rotate-180" : ""}`} />
                </button>

                {isMoreOpen && (
                  <div className="absolute top-[80%] right-0 mt-3 w-52 glass rounded-2xl p-2 shadow-2xl border border-white/20 dark:border-white/5 animate-in fade-in slide-in-from-top-3 duration-300 origin-top-right">
                    {secondaryLinks.map((link) => (
                      <Link 
                        key={link.to}
                        to={link.to} 
                        onClick={() => setIsMoreOpen(false)}
                        className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 gap-3 ${
                          location.pathname === link.to 
                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <link.icon className="w-4.5 h-4.5 opacity-60" /> 
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: User Section */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-amber-400 hover:rotate-12 hover:scale-110 transition-all duration-300 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 fill-current" /> : <Moon className="w-5 h-5 fill-current" />}
              </button>

              {userProfile && (
                <div className="relative" ref={profileRef}>
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="group hidden md:flex items-center gap-3 bg-white/40 dark:bg-black/40 border border-slate-200/50 dark:border-white/5 pl-1.5 pr-4 py-1.5 rounded-2xl hover:bg-white dark:hover:bg-[#0a0a0a] hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
                  >
                    <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5 shrink-0 group-hover:ring-2 ring-indigo-500/20 transition-all">
                      <img src={resolveUserAvatar(userProfile)} alt="Avatar" className="w-full h-full object-contain" onError={handleAvatarError} />
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white dark:border-slate-800 rounded-full ${getOnlineStatus(userProfile.last_seen) ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-[110px] leading-none mb-1">
                        {userProfile?.display_name || userProfile?.full_name?.split(' ')[0]}
                      </span>
                      <span className="text-[9px] uppercase font-black tracking-widest text-indigo-500 dark:text-indigo-400 leading-none opacity-80">
                        {userProfile?.role?.toUpperCase() === 'ADMIN' ? 'SYS ADMIN' : (userProfile?.course?.substring(0, 15) || 'STUDENT')}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-500 ${isProfileOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute top-[80%] right-0 mt-3 w-60 glass rounded-2xl p-2 shadow-2xl border border-white/20 dark:border-slate-800 animate-in fade-in slide-in-from-top-3 duration-300 origin-top-right">
                      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-700/50 mb-1.5 rounded-t-xl bg-slate-50/50 dark:bg-slate-900/50">
                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-2">Connected Profile</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{userProfile?.email}</p>
                      </div>
                      <Link 
                        to="/profile" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all gap-3"
                      >
                        <Settings className="w-4.5 h-4.5 opacity-60" /> Account Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all gap-3 mt-1"
                      >
                        <LogOut className="w-4.5 h-4.5 opacity-60" /> End Current Session
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`lg:hidden w-12 h-12 flex flex-col items-center justify-center gap-1.5 glass rounded-xl transition-all active:scale-90 ${isMobileMenuOpen ? 'hamburger-active' : ''}`}
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
      <div className={`fixed inset-0 z-[100] transition-all duration-500 overflow-hidden ${isMobileMenuOpen ? 'visible' : 'invisible pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-500 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
        
        {/* Panel */}
        <div className={`absolute inset-y-0 right-0 w-[85%] max-w-[320px] bg-white dark:bg-[#050505] shadow-2xl transition-transform duration-500 ease-out border-l border-white/10 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-24 flex items-center justify-between px-8 border-b border-slate-50 dark:border-slate-800/50">
            <div className="flex flex-col">
               <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">CU PORTAL</span>
               <span className="text-[10px] font-black tracking-[0.2em] text-indigo-500 uppercase mt-1">Syllabus Access</span>
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

          <div className="px-6 py-10 space-y-10 overflow-y-auto max-h-[calc(100vh-160px)]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-6 px-1">Academic Core</p>
              <div className="space-y-2">
                {primaryLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-5 py-4 rounded-2xl text-base font-bold transition-all ${
                      location.pathname === link.to
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <link.icon className={`w-5.5 h-5.5 mr-4 ${location.pathname === link.to ? 'text-white' : 'opacity-60'}`} /> {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-1">Resource Hub</p>
              <div className="space-y-2">
                {secondaryLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-5 py-4 rounded-2xl text-base font-bold transition-all ${
                      location.pathname === link.to
                        ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <link.icon className="w-5.5 h-5.5 mr-4 opacity-60" /> {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-8 border-t border-slate-50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-black/20">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm">
                   <img src={resolveUserAvatar(userProfile)} alt="Avatar" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col min-w-0">
                   <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{userProfile?.display_name || userProfile?.full_name}</span>
                   <span className="text-[10px] uppercase font-black text-indigo-500 tracking-widest truncate">{userProfile?.course?.substring(0, 24) || 'Verified Student'}</span>
                </div>
             </div>
             <button
               onClick={handleLogout}
               className="w-full h-12 flex items-center justify-center mt-6 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-black uppercase tracking-widest hover:bg-red-100 transition-all"
             >
               Sign Out
             </button>
          </div>
        </div>
      </div>
    </>
  );
}
