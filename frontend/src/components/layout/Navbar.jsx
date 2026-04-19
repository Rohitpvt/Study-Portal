import { useState } from 'react';
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
  UploadCloud 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { resolveUserAvatar, getOnlineStatus, handleAvatarError } from '../../utils/avatarUtils';

export default function Navbar() {
  const { userProfile } = useAuth();
  const { info } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const token = localStorage.getItem('access_token');

  const baseLinks = [
    { to: '/dashboard', label: 'Terminal', icon: LayoutDashboard },
    { to: '/materials', label: 'Library', icon: BookOpen },
    { to: '/favorites', label: 'Favorites', icon: Star },
    { to: '/chat', label: 'Research AI', icon: Bot },
    { to: '/contributions', label: 'Contribute', icon: UploadCloud },
    { to: '/admin', label: 'Admin Panel', icon: ShieldCheck, adminOnly: true },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    info("Cloud session synchronized and terminated.");
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  // Skip rendering on auth pages or if unauthenticated
  const authPages = ['/login', '/register'];
  if (!token || authPages.includes(location.pathname)) return null;

  const navLinks = baseLinks.filter(link => !link.adminOnly || (userProfile && userProfile.role?.toLowerCase() === 'admin'));

  return (
    <nav className="glass sticky top-0 z-50 transition-all duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-18 py-1">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center text-2xl font-black text-slate-900 tracking-tighter gap-1.5 interactive-scale">
              <span className="premium-gradient rounded-xl pb-1 px-2.5 shadow-lg shadow-indigo-200 text-white">CU</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Portal</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-12 md:flex md:space-x-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.to}
                  to={link.to} 
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold transition-all duration-300 ${
                    location.pathname === link.to 
                      ? "border-indigo-600 text-indigo-600" 
                      : "border-transparent text-slate-500 hover:text-indigo-500 hover:border-indigo-200"
                  }`}
                >
                  <link.icon className="w-4.5 h-4.5 mr-2 opacity-80" /> {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {userProfile && (
              <Link to="/profile" className="hidden md:flex items-center gap-3 bg-white/50 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-all interactive-scale" title="Profile Settings">
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-indigo-50 border border-indigo-100 p-0.5 shrink-0">
                  <img src={resolveUserAvatar(userProfile)} alt="Avatar" className="w-full h-full object-contain" onError={handleAvatarError} />
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${getOnlineStatus(userProfile.last_seen) ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700 truncate max-w-[100px] leading-tight">
                    {userProfile.display_name || userProfile.full_name?.split(' ')[0]}
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 leading-tight mt-0.5">
                    {userProfile.course || 'Student'}
                  </span>
                </div>
              </Link>
            )}
            
            <button
              onClick={handleLogout}
              className="hidden md:bg-red-50 md:text-red-600 md:p-2.5 md:rounded-2xl md:hover:bg-red-100 md:transition-all md:flex md:items-center md:gap-2 md:font-bold md:text-sm shadow-sm"
              title="End Secure Session"
            >
              <LogOut className="h-5 w-5" />
            </button>
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden glass p-2 rounded-xl text-slate-600 hover:text-indigo-600 transition-all"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass border-t border-white/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-4 pt-4 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-5 py-4 rounded-2xl text-base font-bold transition-all ${
                  location.pathname === link.to
                    ? 'premium-gradient shadow-xl shadow-indigo-100 text-white'
                    : 'text-slate-600 hover:bg-white/50 hover:text-indigo-600'
                }`}
              >
                <link.icon className="w-5 h-5 mr-4" /> {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-white/20">
              <Link
                to="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center px-5 py-4 rounded-2xl text-base font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all mb-2"
              >
                <UserIcon className="w-5 h-5 mr-4" /> My Profile
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-5 py-4 rounded-2xl text-base font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all"
              >
                <LogOut className="w-5 h-5 mr-4" /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
