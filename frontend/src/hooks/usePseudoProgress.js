import { useState, useEffect, useRef } from 'react';

/**
 * usePseudoProgress
 * Orchestrates a non-linear progress simulation:
 * 0-30%:   Fast (Initialization)
 * 30-70%:  Slow (Processing)
 * 70-95%:  Very Slow (Heavy work)
 * 95-100%: Instant (Finalizing)
 */
export function usePseudoProgress(isActive, onComplete) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Initializing...');
  const timerRef = useRef(null);

  const PHASES = [
    { threshold: 20, label: 'Scanning Content...' },
    { threshold: 45, label: 'Extracting Text...' },
    { threshold: 75, label: 'Analyzing Structure...' },
    { threshold: 90, label: 'Indexing Data...' },
    { threshold: 99, label: 'Finalizing...' }
  ];

  useEffect(() => {
    if (!isActive) {
      if (progress > 0) {
        // Instant complete sequence
        setPhase('Finalizing...');
        setProgress(100);
        if (onComplete) onComplete();
      }
      return;
    }

    const update = () => {
      setProgress(prev => {
        if (prev >= 98) return prev; // Hold at 98 until isActive is false

        let increment = 0;
        if (prev < 30) {
          increment = Math.random() * 2 + 1; // Fast
        } else if (prev < 70) {
          increment = Math.random() * 0.8 + 0.2; // Slow
        } else {
          increment = Math.random() * 0.1 + 0.02; // Very Slow
        }

        const next = Math.min(prev + increment, 98);
        
        // Update phase label based on progress
        const currentPhase = PHASES.find(p => next <= p.threshold);
        if (currentPhase) setPhase(currentPhase.label);

        return next;
      });

      const delay = progress < 30 ? 100 : progress < 70 ? 200 : 500;
      timerRef.current = setTimeout(update, delay);
    };

    update();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive]);

  return { 
    progress: Math.floor(progress), 
    phase 
  };
}
