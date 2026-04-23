import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
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
