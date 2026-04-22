import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Globe, 
  Users, 
  Share2, 
  Mail, 
  ExternalLink,
  Bot,
  BookOpen,
  LayoutDashboard,
  UploadCloud,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Footer() {
  const { userProfile } = useAuth();
  const currentYear = new Date().getFullYear();
  const isLoggedIn = !!userProfile;

  const footerLinks = {
    platform: [
      { name: 'Terminal', to: '/dashboard', authRequired: true },
      { name: 'Library', to: '/materials', authRequired: true },
      { name: 'Research AI', to: '/chat', authRequired: true },
      { name: 'Contribute', to: '/contributions', authRequired: true, role: 'student' },
      { name: 'Admin Panel', to: '/admin', authRequired: true, role: 'admin' },
    ],
    support: [
      { name: 'About Us', to: '/about' },
      { name: 'Contact Us', to: '/contact' },
      { name: 'System Status', to: '#', external: true },
      { name: 'Privacy Policy', to: '#' },
    ],
    social: [
      { name: 'Website', icon: Globe, href: '#' },
      { name: 'Community', icon: Users, href: '#' },
      { name: 'Share', icon: Share2, href: '#' },
    ]
  };

  return (
    <footer className="relative mt-20 border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* Brand Section */}
          <div className="lg:col-span-4 space-y-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="premium-gradient w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black">
                CU
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                PORTAL
              </span>
            </Link>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
              The unified AI-powered research and academic indexing platform for Christ University students. Streamlining access to syllabus and study materials.
            </p>
            <div className="flex items-center gap-4">
              {footerLinks.social.map((item) => (
                <a 
                  key={item.name} 
                  href={item.href}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-white/10 transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                >
                  <item.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div className="lg:col-span-3 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Core Engine</h3>
            <ul className="space-y-4">
              {footerLinks.platform
                .filter(link => {
                  if (link.authRequired && !isLoggedIn) return false;
                  if (link.role && userProfile?.role?.toLowerCase() !== link.role) return false;
                  return true;
                })
                .map((link) => (
                <li key={link.name}>
                  <Link 
                    to={link.to} 
                    className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors flex items-center gap-2 group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 group-hover:bg-indigo-500 transition-colors"></div>
                    {link.name}
                  </Link>
                </li>
              ))}
              {!isLoggedIn && (
                <li>
                  <Link 
                    to="/login" 
                    className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Sign in to access tools
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Support Links */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Resources</h3>
            <ul className="space-y-4">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a 
                      href={link.to}
                      className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      {link.name}
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  ) : (
                    <Link 
                      to={link.to} 
                      className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Security Badge Section */}
          <div className="lg:col-span-3">
             <div className="p-6 rounded-[32px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                   <ShieldCheck className="w-5 h-5" />
                   <span className="text-xs font-black uppercase tracking-widest">Secure Access</span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 leading-relaxed">
                   Authentication is restricted to verified Christ University academic credentials.
                </p>
                <div className="pt-2">
                   <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      Nodes Online
                   </div>
                </div>
             </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            © {currentYear} CU PORTAL. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-slate-300 dark:text-white/10 uppercase tracking-[0.3em]">
              Architected for Excellence
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
               <Mail className="w-3.5 h-3.5" />
               support@christuniversity.in
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
