import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, RefreshCw, ArrowLeft, AlertTriangle, Loader2, Sparkles } from 'lucide-react';

export default function ErrorPage({ 
  type = '404', 
  title, 
  message, 
  fullScreen = true, 
  onRetry,
  isRetrying = false
}) {
  const navigate = useNavigate();
  
  // Configuration for different error types
  const config = {
    '404': {
      defaultTitle: "404",
      defaultMessage: "Look like you're lost. The page you are looking for is not available!",
      defaultSubtitle: "Looks like you're lost",
      showHome: true,
      showBack: true
    },
    'crash': {
      defaultTitle: "500",
      defaultMessage: "Something went wrong. The application encountered an unexpected runtime error.",
      defaultSubtitle: "Application Error",
      showReload: true,
      showHome: true
    },
    'api': {
      defaultTitle: "System Offline",
      defaultMessage: "We couldn't load this data. The server might be unreachable or experiencing high load.",
      defaultSubtitle: "Connection Failed",
      showRetry: true,
      showHome: !!fullScreen 
    },
    'server': {
      defaultTitle: "Server Unreachable",
      defaultMessage: "We are unable to connect to the backend server. Please try again shortly.",
      defaultSubtitle: "Connection Refused",
      showRetry: true,
      showHome: false
    },
    'offline': {
      defaultTitle: "You are offline",
      defaultMessage: "Please check your internet connection and try again.",
      defaultSubtitle: "No Internet Connection",
      showRetry: true,
      showHome: false
    }
  };

  const location = useLocation();
  const [themeIndex, setThemeIndex] = useState(null);
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Random Theme Selection Logic (Bonus: Prevent same theme repeating twice)
  useEffect(() => {
    if (type === '404') {
      // Small reset to trigger re-fade on path change
      setThemeIndex(null); 
      setIsThemeLoading(true);

      const timer = setTimeout(() => {
        const themesCount = 3;
        const lastTheme = sessionStorage.getItem('last_404_theme');
        let newIndex;
        
        do {
          newIndex = Math.floor(Math.random() * themesCount) + 1;
        } while (themesCount > 1 && lastTheme && parseInt(lastTheme) === newIndex);

        sessionStorage.setItem('last_404_theme', newIndex.toString());
        setThemeIndex(newIndex);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [type, location.pathname]);

  const currentThemeUrl = useMemo(() => {
    if (!themeIndex) return null;
    return `/404-themes/theme${themeIndex}/index.html`;
  }, [themeIndex]);

  const currentConfig = config[type] || config['404'];
  const displayTitle = title || currentConfig.defaultTitle;
  const displayMessage = message || currentConfig.defaultMessage;
  const displaySubtitle = currentConfig.defaultSubtitle;

  // Optimized for 404 Random Themes
  if (type === '404' && themeIndex) {
    return (
      <div className="fixed inset-0 w-full h-full bg-slate-950 overflow-hidden flex flex-col">
        {/* Animated Iframe Container */}
        <div className={`flex-1 relative transition-opacity duration-700 ${isThemeLoading || !themeIndex ? 'opacity-0' : 'opacity-100'}`}>
          {themeIndex && (
            <iframe 
              key={`${location.pathname}-${themeIndex}`}
              src={currentThemeUrl}
              className="w-full h-full border-none"
              title={`404 Error Theme ${themeIndex}`}
              onLoad={() => setIsThemeLoading(false)}
            />
          )}
          
          {/* Overlay Dynamic HUD */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-6 pointer-events-none w-full max-w-xl px-6">
             <div className="bg-slate-950/80 backdrop-blur-2xl px-10 py-6 rounded-[2.5rem] border border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex flex-col items-center pointer-events-auto animate-fade-in-up">
                <h3 className="text-white font-black text-2xl uppercase tracking-[0.1em] mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{displaySubtitle}</h3>
                <p className="text-slate-200 text-sm font-semibold mb-6 text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{displayMessage}</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => navigate(-1)}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all border border-white/10 flex items-center gap-2 group"
                  >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Go Back</span>
                  </button>
                  <Link 
                    to="/dashboard"
                    className="px-8 py-3 premium-gradient rounded-2xl text-white text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Return Home
                  </Link>
                </div>
             </div>
          </div>
        </div>

        {/* Loading State during theme switch */}
        {isThemeLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-50">
             <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em]">Calibrating Dimension...</span>
             </div>
          </div>
        )}
      </div>
    );
  }

  const content = (
    <div className="w-full bg-white text-black py-10 overflow-hidden text-center">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-center">
          <div className="w-full sm:w-5/6">
            
            {/* Background GIF container exactly like .four_zero_four_bg */}
            <div 
              className="h-[500px] bg-center bg-no-repeat flex items-start justify-center"
              style={{ backgroundImage: "url('/images/bg.gif')" }}
            >
              <h1 className="text-[80px] font-medium m-0 pt-8" style={{ fontSize: '80px' }}>
                {displayTitle}
              </h1>
            </div>
            
            {/* Content Box exactly like .contant_box_404 */}
            <div className="-mt-[50px] relative z-10 bg-white inline-block px-4">
              <h3 className="font-medium m-0 mb-2 text-3xl">
                {displaySubtitle}
              </h3>
              
              <p className="text-lg m-0 mt-2 mb-4">
                {displayMessage}
              </p>

              <div className="pt-2 flex flex-wrap justify-center gap-4">
                {currentConfig.showBack && (
                  <button 
                    onClick={() => navigate(-1)} 
                    className="text-white !text-white px-5 py-2.5 bg-[#39ac31] my-5 inline-block cursor-pointer border-none"
                    style={{ background: '#39ac31' }}
                  >
                    Go Back
                  </button>
                )}
                
                {currentConfig.showRetry && onRetry && (
                  <button 
                    onClick={onRetry} 
                    disabled={isRetrying}
                    className="text-white !text-white px-5 py-2.5 bg-[#39ac31] my-5 inline-flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ background: '#39ac31' }}
                  >
                    {isRetrying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Trying to reconnect...
                      </>
                    ) : (
                      "Retry Connection"
                    )}
                  </button>
                )}

                {currentConfig.showReload && (
                   <button 
                   onClick={() => window.location.reload()} 
                   className="text-white !text-white px-5 py-2.5 bg-[#39ac31] my-5 inline-block cursor-pointer border-none"
                   style={{ background: '#39ac31' }}
                 >
                   Reload Page
                 </button>
                )}

                {currentConfig.showHome && (
                  <Link 
                    to="/dashboard" 
                    className="text-white !text-white px-5 py-2.5 bg-[#39ac31] my-5 inline-block no-underline"
                    style={{ background: '#39ac31', color: '#fff' }}
                  >
                    Go to Home
                  </Link>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="w-full flex items-center justify-center p-0">
         {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-0 m-0">
      {content}
    </div>
  );
}
