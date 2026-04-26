import { useNavigate } from 'react-router-dom';

/**
 * Reusable premium empty state component.
 * @param {string} icon - Lucide icon component
 * @param {string} title - Main heading
 * @param {string} description - Helpful text
 * @param {string} ctaLabel - Button text (optional)
 * @param {string} ctaText - Button text alternative (optional)
 * @param {string} ctaTo - Navigation target (optional)
 * @param {Function} ctaAction - Click handler alternative to navigation (optional)
 */
export default function EmptyState({ icon: Icon, title, description, ctaLabel, ctaText, ctaTo, ctaAction }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (ctaAction) ctaAction();
    else if (ctaTo) navigate(ctaTo);
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Illustration ring */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-full blur-2xl scale-150" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xl">
          {Icon && <Icon className="w-10 h-10 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />}
        </div>
      </div>

      {/* Copy */}
      <h3 className="text-lg font-black text-slate-700 dark:text-slate-300 tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 font-medium max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {/* CTA */}
      {(ctaLabel || ctaText) && (
        <button
          onClick={handleClick}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          {ctaLabel || ctaText}
        </button>
      )}
    </div>
  );
}
