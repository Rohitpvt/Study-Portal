import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Simple Helper API
  const success = (msg, dur) => addNotification(msg, 'success', dur);
  const error = (msg, dur) => addNotification(msg, 'error', dur);
  const info = (msg, dur) => addNotification(msg, 'info', dur);
  const warn = (msg, dur) => addNotification(msg, 'warning', dur);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, success, error, info, warn }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
