// import axios from 'axios';

// const API = axios.create({
//   baseURL: '/api',
//   headers: {
//     'Content-Type': 'application/json',
//     Accept: 'application/json',
//   },
// });

// // Request interceptor — attach token + fix FormData Content-Type
// API.interceptors.request.use(
//   (config) => {
//     // Attach Bearer token to every request
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     // When sending FormData (e.g. avatar upload), remove the hardcoded
//     // Content-Type so axios can set multipart/form-data WITH the correct
//     // boundary automatically. Without this, Laravel can't parse the file.
//     if (config.data instanceof FormData) {
//       delete config.headers['Content-Type'];
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // Response interceptor — handle expired / invalid token globally
// API.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('token');
//       localStorage.removeItem('user');
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

// export default API;

import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// Extend config to track retry attempts
interface RetryConfig extends AxiosRequestConfig {
  _retryCount?: number;
}

const MAX_RETRIES = 2;        // how many times to auto-retry on 429
const RETRY_DELAY_MS = 3000;  // wait 3 seconds before retrying

const API = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor ────────────────────────────────────────────────────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────────────────
API.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig;

    // ── 401: expired/invalid token ─────────────────────────────────────────────
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // ── 429: rate limited — auto-retry with backoff ────────────────────────────
    if (error.response?.status === 429) {
  // Don't retry login — let the component handle it immediately
  if (config.url?.includes('/auth/login')) {
    return Promise.reject(error);
  }

  config._retryCount = config._retryCount ?? 0;

  if (config._retryCount < MAX_RETRIES) {
        config._retryCount += 1;

        // Honor the Retry-After header if the server sends one (seconds)
        const retryAfterHeader = error.response.headers['retry-after'];
        const delayMs = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) * 1000
          : RETRY_DELAY_MS * config._retryCount; // exponential: 3s, 6s

        console.warn(
          `Rate limited. Retrying in ${delayMs / 1000}s... ` +
          `(attempt ${config._retryCount}/${MAX_RETRIES})`
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return API(config); // retry the original request
      }

      // Max retries exhausted — surface a clear error to the UI
      const rateLimitError = new Error(
        'You are sending too many requests. Please slow down and try again in a moment.'
      );
      (rateLimitError as any).isRateLimit = true;
      return Promise.reject(rateLimitError);
    }

    return Promise.reject(error);
  }
);

export default API;
