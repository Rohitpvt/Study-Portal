/**
 * analytics.js
 * ─────────────────
 * Lightweight wrapper for Umami Analytics tracking.
 * Respects privacy and fails silently if Umami is blocked or unavailable.
 */

const IS_PROD = import.meta.env.PROD;

/**
 * Tracks a custom event in Umami.
 * @param {string} name - Event name (e.g., 'login_success')
 * @param {object} [data] - Optional metadata (non-sensitive)
 */
export const trackEvent = (name, data = {}) => {
  if (!IS_PROD) {
    if (import.meta.env.VITE_ENABLE_LOCAL_ANALYTICS === 'true') {
      console.log(`[Analytics Dev] Event: ${name}`, data);
    }
    return;
  }

  try {
    if (window.umami && typeof window.umami.track === 'function') {
      // Ensure we never track sensitive keys
      const safeData = { ...data };
      const BANNED_KEYS = ['password', 'token', 'otp', 'access_token', 'secret', 'content', 'message'];
      
      Object.keys(safeData).forEach(key => {
        if (BANNED_KEYS.some(bk => key.toLowerCase().includes(bk))) {
          delete safeData[key];
        }
      });

      window.umami.track(name, safeData);
    }
  } catch (err) {
    // Fail silently in production
  }
};

/**
 * Tracks a page view manually. 
 * Umami tracks automatically on history change, but this is useful 
 * for virtual pages or manual triggers.
 * @param {string} [url] - Optional URL override
 */
export const trackPageView = (url) => {
  if (!IS_PROD) return;

  try {
    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track(url || window.location.pathname);
    }
  } catch (err) {
    // Fail silently
  }
};

const analytics = {
  trackEvent,
  trackPageView
};

export default analytics;
