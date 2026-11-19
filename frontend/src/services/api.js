import axios from 'axios';

const isVercelProd =
  typeof window !== 'undefined' &&
  window.location.hostname.endsWith('.vercel.app');

const api = axios.create({
  baseURL: isVercelProd
    ? `${window.location.origin}/api/v1`
    : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'),
});

// Attach JWT header and sanitize endpoint paths before requests
api.interceptors.request.use(
  (config) => {
    // Strip trailing slash from API paths to avoid triggering SPA index.html fallback on Vercel
    if (config.url && config.url.length > 1 && config.url.endsWith('/')) {
      config.url = config.url.slice(0, -1);
    }

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Guard against accidental HTML responses from SPA fallback rewrites
    const contentType = response.headers?.['content-type'] || '';
    if (
      contentType.includes('text/html') &&
      typeof response.data === 'string' &&
      response.data.includes('<!doctype html>')
    ) {
      return Promise.reject(new Error('Invalid API response: received HTML from SPA fallback instead of JSON.'));
    }
    return response;
  },
  (error) => {
    // 1. Connection Refused / Network Error / Timeout Detection
    const isNetworkError = !error.response && error.code === 'ERR_NETWORK';
    const isTimeout = error.code === 'ECONNABORTED';
    
    if (isNetworkError || isTimeout) {
      window.dispatchEvent(new CustomEvent('server-error'));
    }

    // 2. Authentication Revocation Guard
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      if (!['/login', '/register'].includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
