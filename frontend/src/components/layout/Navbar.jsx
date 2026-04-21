import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  LogOut, 
  ShieldCheck, 
  Star, 
  Menu, 
  X, 
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
  const token = localStorage.getItem('access_token');
  
  const moreRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    info("Cloud session synchronized and terminated.");
    navigate('/login');
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  };

  // Skip rendering on auth pages or if unauthenticated
  const authPages = ['/login', '/register'];
  if (!token || authPages.includes(location.pathname)) return null;

  const isAdmin = userProfile && userProfile.role?.toLowerCase() === 'admin';

  // Primary Center Links
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

  // Secondary "More" Links
  const secondaryLinks = [
    { to: '/favorites', label: 'Favorites', icon: Star },
    { to: '/about', label: 'About Us', icon: Info },
    { to: '/contact', label: 'Contact Us', icon: Mail },
  ];

  return (
    <>
      <nav className="glass sticky top-0 z-50 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 py-2">
            
            {/* LEFT: Brand Section */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center text-2xl font-black text-slate-900 dark:text-white tracking-tighter gap-1.5 interactive-scale">
                <span className="premium-gradient rounded-xl pb-1 px-2.5 shadow-lg shadow-indigo-200 dark:shadow-indigo-900 text-white">CU</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 hidden sm:inline">Portal</span>
              </Link>
            </div>

            {/* CENTER: Primary Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <div className="flex items-center gap-1">
                {primaryLinks.map((link) => (
                  <Link 
                    key={link.to}
                    to={link.to} 
                    className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 gap-2 ${
                      location.pathname === link.to 
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <link.icon className={`w-4.5 h-4.5 ${location.pathname === link.to ? "text-indigo-600 dark:text-indigo-400" : "opacity-70"}`} /> 
                    {link.label}
                  </Link>
                ))}

                {/* MORE Dropdown */}
                <div className="relative ml-2" ref={moreRef}>
                  <button
                    onClick={() => setIsMoreOpen(!isMoreOpen)}
                    className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 gap-2 ${
                      isMoreOpen ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    More <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isMoreOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isMoreOpen && (
                    <div className="absolute right-0 mt-2 w-48 glass rounded-2xl p-2 shadow-2xl border border-white/40 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      {secondaryLinks.map((link) => (
                        <Link 
                          key={link.to}
                          to={link.to} 
                          onClick={() => setIsMoreOpen(false)}
                          className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 gap-3 ${
                            location.pathname === link.to 
                              ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" 
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-500 dark:hover:text-indigo-400"
                          }`}
                        >
                          <link.icon className="w-4.5 h-4.5 opacity-70" /> 
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: User Section */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 sm:p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none shadow-inner"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {userProfile && (
                <div className="relative" ref={profileRef}>
                  <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="hidden md:flex items-center gap-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 pl-2 pr-4 py-1.5 rounded-full hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500 transition-all interactive-scale shadow-sm"
                  >
                    <div className="relative w-9 h-9 rounded-full overflow-hidden bg-indigo-50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-700 p-0.5 shrink-0">
                      <img src={resolveUserAvatar(userProfile)} alt="Avatar" className="w-full h-full object-contain" onError={handleAvatarError} />
                      <div className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 border-2 border-white dark:border-slate-800 rounded-full ${getOnlineStatus(userProfile.last_seen) ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[100px] leading-tight">
                        {userProfile.display_name || userProfile.full_name?.split(' ')[0]}
                      </span>
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 leading-tight mt-0.5">
                        {userProfile.role?.toUpperCase() === 'ADMIN' ? 'SYSTEM ADMIN' : (userProfile.course?.substring(0, 15) || 'STUDENT')}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 glass rounded-2xl p-2 shadow-2xl border border-white/40 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 mb-1">
                        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">Connected as</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{userProfile.email}</p>
                      </div>
                      <Link 
                        to="/profile" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all gap-3"
                      >
                        <Settings className="w-4.5 h-4.5 opacity-70" /> Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all gap-3 mt-1"
                      >
                        <LogOut className="w-4.5 h-4.5 opacity-70" /> Logout Session
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden glass p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 transition-all active:scale-95"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer - Extracted from <nav> to escape z-index / sticky stacking context */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] animate-in fade-in duration-300">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          {/* Panel */}
          <div className="absolute inset-y-0 right-0 w-[280px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-100 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-500">
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-50 dark:border-slate-800/50 shrink-0">
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Navigation</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">Main Menu</p>
                <div className="space-y-1.5">
                  {primaryLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                        location.pathname === link.to
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                    >
                      <link.icon className="w-5 h-5 mr-4" /> {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">Other</p>
                <div className="space-y-1.5">
                  {secondaryLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                        location.pathname === link.to
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                      }`}
                    >
                      <link.icon className="w-5 h-5 mr-4" /> {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">Account</p>
                <div className="space-y-1.5">
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3.5 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <UserIcon className="w-5 h-5 mr-4" /> Profile Details
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3.5 rounded-2xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-5 h-5 mr-4" /> End Session
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-50 bg-slate-50/50">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 p-0.5 shadow-sm">
                     <img src={resolveUserAvatar(userProfile)} alt="Avatar" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col min-w-0">
                     <span className="text-xs font-bold text-slate-700 truncate">{userProfile.display_name || userProfile.full_name}</span>
                     <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest truncate">{userProfile.course?.substring(0, 20) || 'Verified User'}</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
