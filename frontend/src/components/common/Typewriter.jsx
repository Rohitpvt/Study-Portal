import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

const CodeBlock = ({ language, value, ...props }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation(); // Prevent typewriter instant finish
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden my-6 border border-slate-700/50 dark:border-white/10 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 dark:bg-slate-900 border-b border-slate-700/50 dark:border-white/5 backdrop-blur-md">
        <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-all font-medium text-[11px] active:scale-95"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="text-[13px] leading-relaxed relative">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1.5rem', background: '#0d1117' }}
          {...props}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

/**
 * Typewriter Component
 * Features:
 * - Variable cadence (human-like)
 * - Punctuation awareness (pauses)
 * - Code block detection (slower typing)
 * - Instant completion on click
 */
const Typewriter = ({ 
  text = "", 
  onComplete, 
  skipAnimation = false,
  maxDelay = 1500 // Max length to animate
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  // Safeguard: Skip if too long or requested
  const shouldSkip = skipAnimation || text.length > maxDelay;

  useEffect(() => {
    if (shouldSkip) {
      setDisplayText(text);
      setIsTyping(false);
      if (onComplete) onComplete();
      return;
    }

    const type = () => {
      if (indexRef.current >= text.length) {
        setIsTyping(false);
        if (onComplete) onComplete();
        return;
      }

      const currentChar = text[indexRef.current];
      const nextChar = text[indexRef.current + 1];
      
      setDisplayText(prev => prev + currentChar);
      indexRef.current += 1;

      // Determine Delay
      let delay = Math.random() * 25 + 15; // Base speed: 15-40ms

      // Punctuation awareness
      if (['.', '!', '?', ':'].includes(currentChar)) {
        delay = 400; // Long pause
      } else if ([',', ';', '-'].includes(currentChar)) {
        delay = 150; // Short pause
      }

      // Code block awareness (Markdown ``` check)
      // Check if we are currently inside triple backticks
      const textSoFar = text.slice(0, indexRef.current);
      const backtickCount = (textSoFar.match(/```/g) || []).length;
      if (backtickCount % 2 !== 0) {
        delay += 40; // Slower for code blocks as requested
      }

      timeoutRef.current = setTimeout(type, delay);
    };

    type();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, shouldSkip]);

  const handleFinishInstantly = () => {
    if (isTyping) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setDisplayText(text);
      setIsTyping(false);
      if (onComplete) onComplete();
    }
  };

  return (
    <div 
      className="relative cursor-pointer" 
      onClick={handleFinishInstantly}
    >
      <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-white/5">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <CodeBlock 
                  language={match[1]} 
                  value={String(children).replace(/\n$/, '')} 
                  {...props} 
                />
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {displayText}
        </ReactMarkdown>
      </div>
      
      {isTyping && (
        <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle" />
      )}
    </div>
  );
};

export default Typewriter;
