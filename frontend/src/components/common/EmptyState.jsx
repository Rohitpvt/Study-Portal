import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  actionTo, 
  secondaryActionLabel,
  secondaryActionOnClick,
  illustrationType = "default" 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px] w-full max-w-lg mx-auto"
    >
      <div className="relative w-48 h-48 mb-8">
        <div className="absolute inset-0 bg-christ-blue/5 dark:bg-christ-blue/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="relative z-10 w-full h-full flex items-center justify-center bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-christ-blue/5 border border-slate-100 dark:border-slate-700/50 rotate-[-4deg] hover:rotate-0 transition-all duration-300">
           {Icon ? (
               <Icon className="w-20 h-20 text-christ-blue dark:text-blue-400" strokeWidth={1.5} />
           ) : (
               <svg className="w-20 h-20 text-christ-blue dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
               </svg>
           )}
        </div>
      </div>

      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
        {title || "Nothing to see here"}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
        {description || "We couldn't find any items matching your criteria. Try adjusting your filters or checking back later."}
      </p>

      <div className="flex gap-4">
          {actionLabel && actionTo && (
            <Link 
              to={actionTo}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-christ-blue hover:bg-christ-blue-dark shadow-lg shadow-christ-blue/20 transition-all active:scale-95"
            >
              {actionLabel}
            </Link>
          )}
          {secondaryActionLabel && secondaryActionOnClick && (
            <button 
              onClick={secondaryActionOnClick}
              className="inline-flex items-center justify-center px-6 py-3 border border-slate-200 dark:border-slate-700 text-base font-medium rounded-xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              {secondaryActionLabel}
            </button>
          )}
      </div>
    </motion.div>
  );
};

export default EmptyState;
