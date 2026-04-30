import { useState, useEffect } from 'react';
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
import Onboarding from './components/common/Onboarding';
import { trackPageView } from './services/analytics';

const RouteTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  return null;
};

const AppContent = () => {
  const { isOffline, isServerDown, isRetrying, isWakingUp, checkHealth } = useSystem();

  if (isOffline) {
    return <ErrorPage type="offline" onRetry={checkHealth} isRetrying={isRetrying} />;
  }
  
  if (isServerDown && !isWakingUp) {
    return <ErrorPage type="server" onRetry={checkHealth} isRetrying={isRetrying} />;
  }

  return (
      <ErrorBoundary>
        <Onboarding />
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
            
            {/* Restricted Route: Students and Teachers */}
            <Route element={<AuthGuard allowedRoles={['student', 'teacher']} />}>
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
            <RouteTracker />
            <AppContent />
          </BrowserRouter>
        </NotificationProvider>
      </SystemProvider>
    </ThemeProvider>
  );
}

export default App;
