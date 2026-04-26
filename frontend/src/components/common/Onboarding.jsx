import { useState } from 'react';
import { BookOpen, Bot, UploadCloud, User, X, ChevronRight, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: BookOpen,
    title: 'Browse Materials',
    desc: 'Explore curated study notes, assignments, and previous papers from the academic library.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Bot,
    title: 'Ask AI Study Assistant',
    desc: 'Get instant, document-grounded answers powered by RAG AI. Ask anything academic.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: UploadCloud,
    title: 'Upload Contributions',
    desc: 'Share your notes with classmates. Our AI validates quality before publishing.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: User,
    title: 'Complete Your Profile',
    desc: 'Personalize your avatar, bio, and display name to stand out on the platform.',
    color: 'from-amber-500 to-orange-500',
  },
];

const STORAGE_KEY = 'cu_onboarding_completed';

/**
 * One-time welcome walkthrough for new users.
 * Dismissed state persisted to localStorage.
 */
export default function Onboarding() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  );
  const [currentStep, setCurrentStep] = useState(0);

  if (dismissed) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  const handleNext = () => {
    if (isLast) {
      handleDismiss();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className={`p-8 pb-6 bg-gradient-to-br ${step.color} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <step.icon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-xs font-bold uppercase tracking-widest">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">{step.title}</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed text-center">
            {step.desc}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-8 bg-indigo-500' : i < currentStep ? 'w-4 bg-indigo-300' : 'w-4 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              {isLast ? 'Get Started' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
