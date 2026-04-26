import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import api from '../services/api';

const SystemContext = createContext();

const COLD_START_THRESHOLD_MS = 5000;

export function SystemProvider({ children }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isServerDown, setIsServerDown] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const coldStartTimer = useRef(null);

  // Dynamically derive backend origin from the main API configuration
  const derivedOrigin = new URL(api.defaults.baseURL || 'http://127.0.0.1:8000/api/v1').origin;
  const healthCheckUrl = `${derivedOrigin}/health`;

  const checkHealth = useCallback(async () => {
    if (!navigator.onLine) return false;
    
    setIsRetrying(true);

    // Start cold-start timer: if health check takes >5s, show waking banner
    coldStartTimer.current = setTimeout(() => {
      setIsWakingUp(true);
    }, COLD_START_THRESHOLD_MS);

    try {
      await axios.get(healthCheckUrl, { timeout: 60000 }); // 60s timeout for cold starts
      setIsServerDown(false);
      setIsWakingUp(false);
      clearTimeout(coldStartTimer.current);
      setIsRetrying(false);
      return true;
    } catch (error) {
      setIsServerDown(true);
      setIsWakingUp(false);
      clearTimeout(coldStartTimer.current);
      setIsRetrying(false);
      return false;
    }
  }, []);

  // 1. Listen for browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Immediately check backend health when we come back online
      checkHealth();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkHealth]);

  // 2. Listen for custom server-error events dispatched by the API interceptor
  useEffect(() => {
    const handleServerError = () => {
      if (!isServerDown && !isOffline) {
        setIsServerDown(true);
      }
    };

    window.addEventListener('server-error', handleServerError);
    return () => window.removeEventListener('server-error', handleServerError);
  }, [isServerDown, isOffline]);

  // 3. Auto-Retry Loop when server is down but browser is online
  useEffect(() => {
    let intervalId;
    if (isServerDown && !isOffline && !isRetrying) {
      intervalId = setInterval(() => {
        checkHealth();
      }, 7000); // Check every 7 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isServerDown, isOffline, isRetrying, checkHealth]);

  // 4. Initial startup health check
  useEffect(() => {
    if (!isOffline) {
      checkHealth();
    }
  }, [checkHealth, isOffline]);

  return (
    <SystemContext.Provider value={{
      isOffline,
      isServerDown,
      isRetrying,
      isWakingUp,
      checkHealth
    }}>
      {children}
    </SystemContext.Provider>
  );
}

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};

