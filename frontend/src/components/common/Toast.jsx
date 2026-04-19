import React, { useEffect, useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { 
  CheckCircle, 
  XCircle, 
  Info, 
  AlertTriangle, 
  X,
  Loader2
} from 'lucide-react';

const ToastItem = ({ notification }) => {
  const { removeNotification } = useNotification();
  const [isClosing, setIsClosing] = useState(false);
  const { id, message, type, duration } = notification;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsClosing(true);
      }, duration - 300); // Start fade out slightly before duration ends
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
  };

  const onAnimationEnd = () => {
    if (isClosing) {
      removeNotification(id);
    }
  };

  const configs = {
    success: {
      bg: 'bg-emerald-500/90',
      icon: <CheckCircle className="w-5 h-5" />,
      lightBg: 'bg-emerald-50/10'
    },
    error: {
      bg: 'bg-rose-500/90',
      icon: <XCircle className="w-5 h-5" />,
      lightBg: 'bg-rose-50/10'
    },
    info: {
      bg: 'bg-blue-500/90',
      icon: <Info className="w-5 h-5" />,
      lightBg: 'bg-blue-50/10'
    },
    warning: {
      bg: 'bg-amber-500/90',
      icon: <AlertTriangle className="w-5 h-5" />,
      lightBg: 'bg-amber-50/10'
    },
    loading: {
      bg: 'bg-slate-700/90',
      icon: <Loader2 className="w-5 h-5 animate-spin" />,
      lightBg: 'bg-slate-50/10'
    }
  };

  const config = configs[type] || configs.info;

  return (
    <div
      onTransitionEnd={onAnimationEnd}
      className={`
        pointer-events-auto
        flex items-center gap-3 px-4 py-3 min-w-[320px] max-w-md
        rounded-2xl backdrop-blur-xl border border-white/20
        shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-white
        transition-all duration-300 ease-out transform
        ${isClosing ? 'opacity-0 scale-95 translate-x-8' : 'opacity-100 scale-100 translate-x-0'}
        ${config.bg}
      `}
    >
      <div className={`p-2 rounded-xl ${config.lightBg}`}>
        {config.icon}
      </div>
      
      <div className="flex-1">
        <p className="text-sm font-medium leading-tight">
          {message}
        </p>
      </div>

      <button
        onClick={handleClose}
        className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>

      {duration > 0 && !isClosing && (
        <div className="absolute bottom-0 left-0 h-[2px] bg-white/30 transition-all duration-linear"
             style={{
               width: '100%',
               animation: `toast-progress ${duration}ms linear forwards`
             }} 
        />
      )}
    </div>
  );
};

export const ToastContainer = () => {
  const { notifications } = useNotification();

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} />
      ))}
    </div>
  );
};
