import { useEffect, useRef } from 'react';

export default function MouseGlow() {
  const glowRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!glowRef.current) return;
      
      // Update position using CSS variables for high performance
      glowRef.current.style.setProperty('--mouse-x', `${e.clientX}px`);
      glowRef.current.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={glowRef}
      className="fixed inset-0 pointer-events-none z-[9999] opacity-0 lg:opacity-100 transition-opacity duration-1000 overflow-hidden"
      style={{
        background: `radial-gradient(800px circle at var(--mouse-x, -100%) var(--mouse-y, -100%), var(--mouse-glow-color), transparent 80%)`
      }}
    />
  );
}
