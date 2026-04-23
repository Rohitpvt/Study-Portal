import React, { useState, useEffect } from 'react';
import './MaterialLoader.css';

/**
 * Premium Hyper-Speed Animated Loader
 * Upgraded with pseudo-realistic progress and phase indicators.
 */
const MaterialLoader = ({ 
  message = "Synchronizing study resources", 
  progress = 0, 
  showProgress = false, 
  phase = "" 
}) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // 150ms delay threshold: smoother entry than prior 250ms
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldRender) return null;

  return (
    <div className="ml-container animate-fade-in-up" aria-label="Loading materials">
      <div className="ml-longfazers">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className="ml-loader-wrapper">
        <div className="ml-loader">
          <span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          <div className="ml-base">
            <span></span>
            <div className="ml-face"></div>
          </div>
        </div>
      </div>

      <div className="z-20 flex flex-col items-center gap-4 text-center">
        <h3 className="ml-text">
          {message}
        </h3>
        
        {showProgress && (
          <div className="ml-progress-wrapper">
            <div className="ml-progress-bar-bg">
              <div 
                className="ml-progress-bar-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="ml-meta">
              <span className="ml-phase">{phase || 'Consulting Intelligence...'}</span>
              <span className="ml-percentage">{progress}%</span>
            </div>
          </div>
        )}

        {!showProgress && (
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] animate-pulse px-6">
              Connecting to secure cloud infrastructure...
          </p>
        )}
      </div>
    </div>
  );
};

export default MaterialLoader;
