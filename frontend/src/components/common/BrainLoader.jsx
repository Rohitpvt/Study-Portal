import React from 'react';
import './BrainLoader.css';

/**
 * BrainLoader - Premium AI Thinking Animation
 * Features neural path glowing, synapse pulsing, and orbital particles.
 */
const BrainLoader = ({ message = "Thinking...", subtext = "Analyzing Request" }) => {
  return (
    <div className="bl-container" role="status" aria-label="AI is thinking">
      <div className="relative">
        {/* SVG Brain Structure */}
        <svg 
          viewBox="0 0 100 100" 
          className="bl-brain-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="bl-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <radialGradient id="bl-glow-gradient">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Glow Ring */}
          <circle className="bl-glow-ring" cx="50" cy="50" r="48" />

          {/* Left Hemisphere Outline */}
          <path 
            className="bl-brain-path"
            d="M50 85C35 85 20 75 20 50C20 25 35 15 50 15V85Z" 
          />
          {/* Right Hemisphere Outline */}
          <path 
            className="bl-brain-path"
            d="M50 85C65 85 80 75 80 50C80 25 65 15 50 15V85Z" 
          />

          {/* Neural Nodes (Synapses) */}
          <circle className="bl-node-glow" cx="35" cy="40" r="4" />
          <circle className="bl-node" cx="35" cy="40" r="1.5" />
          
          <circle className="bl-node-glow" cx="65" cy="45" r="4" />
          <circle className="bl-node" cx="65" cy="45" r="1.5" />
          
          <circle className="bl-node-glow" cx="45" cy="65" r="4" />
          <circle className="bl-node" cx="45" cy="65" r="1.5" />
          
          <circle className="bl-node-glow" cx="55" cy="30" r="4" />
          <circle className="bl-node" cx="55" cy="30" r="1.5" />

          <circle className="bl-node-glow" cx="30" cy="60" r="4" />
          <circle className="bl-node" cx="30" cy="60" r="1.5" />

          {/* Orbitals */}
          <circle className="bl-orbital" cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="1 10" />
        </svg>

        {/* Orbiting Particles (Optional, using CSS for rotation) */}
        <div className="absolute inset-0 animate-spin-slow opacity-40">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full blur-[1px]"></div>
        </div>
      </div>

      <div className="bl-text-container">
        <span className="bl-main-text">{message}</span>
        <span className="bl-sub-text">{subtext}</span>
      </div>
    </div>
  );
};

export default BrainLoader;
