import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, RefreshCw, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';

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

  const currentConfig = config[type] || config['404'];
  const displayTitle = title || currentConfig.defaultTitle;
  const displayMessage = message || currentConfig.defaultMessage;
  const displaySubtitle = currentConfig.defaultSubtitle;

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
