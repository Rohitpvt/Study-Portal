import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

export default function AuthGuard({ allowedRoles }) {
  const [authStatus, setAuthStatus] = useState(null); // null: loading, false: unauthorized, 'forbidden': bad role, true: authorized

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setAuthStatus(false);
        return;
      }
      
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('access_token');
          setAuthStatus(false);
        } else if (decoded.role?.toLowerCase() === 'developer') {
          // Developers have god-mode access to all restricted routes
          setAuthStatus(true);
        } else if (allowedRoles && !allowedRoles.includes(decoded.role?.toLowerCase())) {
          setAuthStatus('forbidden');
        } else {
          setAuthStatus(true);
        }
      } catch (err) {
        localStorage.removeItem('access_token');
        setAuthStatus(false);
      }
    };
    checkAuth();
  }, [allowedRoles]);

  if (authStatus === null) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-bold">Verifying secure session...</div>;
  }

  if (authStatus === false) {
    return <Navigate to="/login" replace />;
  }

  if (authStatus === 'forbidden') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
