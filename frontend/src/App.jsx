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

  return (
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

            {/* Restricted Route: Admins Only */}
            <Route element={<AuthGuard allowedRoles={['admin']} />}>
              <Route path="/admin" element={<Admin />} />
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
  const shouldHideFooter = hideFooterOn.some(path => location.pathname.startsWith(path));

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-transparent transition-colors duration-300">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8">
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
