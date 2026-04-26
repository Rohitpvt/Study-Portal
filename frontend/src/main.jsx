import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.1, 
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Privacy: Scrub sensitive data
    beforeSend(event) {
      if (event.request && event.request.data) {
        const sensitiveFields = ['password', 'otp', 'token', 'access_token', 'secret'];
        try {
          const data = JSON.parse(event.request.data);
          sensitiveFields.forEach(field => {
            if (data[field]) data[field] = '[REDACTED]';
          });
          event.request.data = JSON.stringify(data);
        } catch (e) { /* not JSON */ }
      }
      return event;
    },
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
