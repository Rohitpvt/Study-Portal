import React from 'react';
import ErrorPage from './ErrorPage';
import * as Sentry from "@sentry/react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error securely to the console (not exposed in UI)
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Capture in Sentry
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Return the custom branded crash page
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-['Outfit',_sans-serif]">
            <ErrorPage type="crash" fullScreen={true} />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
