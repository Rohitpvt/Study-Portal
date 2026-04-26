import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
});

// Attach JWT header before requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Set up a timer to detect slow Render cold starts (>5s)
    config._wakingUpTimer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('server-waking-up'));
    }, 5000);
    
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.config && response.config._wakingUpTimer) {
        clearTimeout(response.config._wakingUpTimer);
    }
    window.dispatchEvent(new CustomEvent('server-awake'));
    return response;
  },
  (error) => {
    if (error.config && error.config._wakingUpTimer) {
        clearTimeout(error.config._wakingUpTimer);
    }
    window.dispatchEvent(new CustomEvent('server-awake')); // Errors still mean server responded
    
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
