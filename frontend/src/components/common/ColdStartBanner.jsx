import { Cpu } from 'lucide-react';

/**
 * Premium animated banner shown when backend is waking up from cold start.
 * Appears at the top of the viewport with a pulsing animation.
 */
export default function ColdStartBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 text-white shadow-xl shadow-indigo-500/30 animate-pulse">
      <div className="flex items-center gap-3 text-sm font-bold tracking-tight">
        <Cpu className="w-5 h-5 animate-spin" style={{ animationDuration: '2s' }} />
        <span>Waking up AI servers… this may take a few seconds</span>
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  );
}
