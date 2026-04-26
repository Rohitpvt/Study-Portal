import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import AuthGuard from './components/layout/AuthGuard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import Favorites from './pages/Favorites';
import Contributions from './pages/Contributions';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import AdminFileHealth from './pages/AdminFileHealth';
import ProfileControl from './pages/ProfileControl';
import DocumentViewer from './pages/Viewer';
import Profile from './pages/Profile';
import About from './pages/About';
import Contact from './pages/Contact';
import Footer from './components/layout/Footer';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastContainer } from './components/common/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { SystemProvider, useSystem } from './context/SystemContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ErrorPage from './components/common/ErrorPage';
import MouseGlow from './components/common/MouseGlow';

const AppContent = () => {
  const { isOffline, isServerDown, isRetrying, checkHealth } = useSystem();

  if (isOffline) {
    return <ErrorPage type="offline" onRetry={checkHealth} isRetrying={isRetrying} />;
  }
  
  if (isServerDown) {
    return <ErrorPage type="server" onRetry={checkHealth} isRetrying={isRetrying} />;
  }

  const WakingUpBanner = () => {
    if (!isWakingUp || isServerDown) return null;
    return (
      <div className="fixed top-0 left-0 right-0 h-1 bg-christ-blue/20 z-50 overflow-hidden">
        <div className="absolute top-0 left-0 h-full bg-christ-blue animate-[progressBar_2s_ease-in-out_infinite]" style={{width: '30%'}}></div>
        <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 text-christ-blue dark:text-blue-400 px-6 py-2 rounded-b-xl shadow-lg border border-t-0 border-christ-blue/20 dark:border-slate-700 font-medium text-sm flex items-center gap-3 z-50 flex flex-row">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Waking up AI servers... this may take a few seconds.
        </div>
        <style>{`
            @keyframes progressBar {
                0% { left: -30%; }
                100% { left: 100%; }
            }
        `}</style>
      </div>
    );
  };

  return (
      <>
        <WakingUpBanner />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Public Routes - No Navbar */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        
        {/* Protected Routes - With Navbar and Layout */}
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/viewer/:materialId" element={<DocumentViewer />} />
            <Route path="/viewer" element={<DocumentViewer />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Restricted Route: Students Only */}
            <Route element={<AuthGuard allowedRoles={['student']} />}>
              <Route path="/contributions" element={<Contributions />} />
            </Route>

            {/* Restricted Route: Admins AND Developers */}
            <Route element={<AuthGuard allowedRoles={['admin', 'developer']} />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/health" element={<AdminFileHealth />} />
            </Route>

            {/* Restricted Route: Developer Only */}
            <Route element={<AuthGuard allowedRoles={['developer']} />}>
              <Route path="/profile-control" element={<ProfileControl />} />
            </Route>
          </Route>
        </Route>

        {/* Public Routes - With Navbar and Layout */}
        <Route element={<AppLayout />}>
           <Route path="/about" element={<About />} />
           <Route path="/contact" element={<Contact />} />
        </Route>

        {/* Fallback 404 Route */}
        <Route path="*" element={<ErrorPage type="404" />} />

        </Routes>
      </ErrorBoundary>
      </>
  );
};


const AppLayout = () => {
  const location = useLocation();
  const hideFooterOn = ['/viewer', '/chat'];
  const isChatPage = location.pathname.startsWith('/chat');
  const isViewerPage = location.pathname.startsWith('/viewer');
  const shouldHideFooter = hideFooterOn.some(path => location.pathname.startsWith(path));

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-transparent transition-colors duration-300">
        <Navbar />
        <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8 transition-all duration-500 ${
          isChatPage ? 'max-w-[1800px]' : isViewerPage ? 'max-w-screen-2xl' : 'max-w-7xl'
        }`}>
          <Outlet />
        </main>
        {!shouldHideFooter && <Footer />}
      </div>
    </AuthProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <SystemProvider>
        <NotificationProvider>
          <ToastContainer />
          <MouseGlow />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </NotificationProvider>
      </SystemProvider>
    </ThemeProvider>
  );
}

export default App;
