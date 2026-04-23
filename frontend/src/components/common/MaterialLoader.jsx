import React, { useState, useEffect } from 'react';
import './MaterialLoader.css';

/**
 * Premium Hyper-Speed Animated Loader
 * Used for initial material fetches. 
 * Includes a delay threshold to prevent flickering on fast connections.
 */
const MaterialLoader = () => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // 250ms delay threshold to prevent flicker on extremely fast fetches
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldRender) return null;

  return (
    <div className="ml-container" aria-label="Loading materials">
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

      <div className="z-20 text-center space-y-4">
        <h3 className="ml-text">
          Synchronizing study resources
        </h3>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] animate-pulse">
            Fetching documents from cloud library...
        </p>
      </div>
    </div>
  );
};

export default MaterialLoader;
