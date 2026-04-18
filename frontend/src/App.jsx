import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import { AuthProvider } from './context/AuthContext';

const AppLayout = () => (
  <AuthProvider>
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  </AuthProvider>
);

function App() {
  return (
    <BrowserRouter>
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

      </Routes>
    </BrowserRouter>
  );
}

export default App;
