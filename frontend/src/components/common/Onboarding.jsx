import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Map, MessageSquareText, UploadCloud, UserCircle } from 'lucide-react';

const steps = [
  {
    title: "Welcome to AI Library",
    description: "Your smart companion for Christ University studies. Let's take a quick tour.",
    icon: Map,
    color: "text-christ-blue dark:text-blue-400"
  },
  {
    title: "Browse Materials",
    description: "Access verified notes, previous papers, and assignments securely.",
    icon: BookOpen,
    color: "text-christ-blue dark:text-blue-400"
  },
  {
    title: "Ask the AI Chatbot",
    description: "Get precise, document-grounded answers to any academic queries.",
    icon: MessageSquareText,
    color: "text-emerald-500 dark:text-emerald-400"
  },
  {
    title: "Contribute",
    description: "Upload your own notes. Our AI pipeline will validate them instantly.",
    icon: UploadCloud,
    color: "text-amber-500 dark:text-amber-400"
  },
  {
    title: "Complete Profile",
    description: "Head to your profile to set up your subjects and courses for personalized results.",
    icon: UserCircle,
    color: "text-purple-500 dark:text-purple-400"
  }
];

export default function Onboarding() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_onboarding');
    if (!hasSeen) {
        // Small delay so it doesn't jarringly flash
        const timer = setTimeout(() => setIsOpen(true), 1500);
        return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const StepIcon = steps[currentStep].icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
        >
          {/* Progress bar background block */}
          <div className="absolute top-0 left-0 right-0 h-1 flex gap-1 bg-slate-100 dark:bg-slate-800">
             {steps.map((_, i) => (
                 <div key={i} className={`h-full flex-1 transition-colors duration-300 ${i <= currentStep ? 'bg-christ-blue' : 'bg-transparent'}`} />
             ))}
          </div>

          <div className="flex flex-col items-center text-center mt-4">
            <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 mb-6 border border-slate-100 dark:border-slate-700`}>
              <StepIcon className={`w-12 h-12 ${steps[currentStep].color}`} />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-[250px]">
              {steps[currentStep].description}
            </p>

            <div className="flex items-center w-full gap-3">
              <button 
                onClick={handleClose}
                className="flex-1 py-3 px-4 font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                Skip
              </button>
              <button 
                onClick={handleNext}
                className="flex-1 py-3 px-4 bg-christ-blue hover:bg-christ-blue-dark text-white rounded-xl shadow-lg shadow-christ-blue/20 font-medium transition-transform active:scale-95"
              >
                {currentStep === steps.length - 1 ? "Let's Go!" : "Next"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
