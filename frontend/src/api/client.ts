import axios from 'axios';

export const normalizeApiBaseUrl = (rawUrl?: string): string => {
  let url = (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') 
    ? rawUrl.trim() 
    : 'http://127.0.0.1:8000';

  // Strip trailing slashes
  url = url.replace(/\/+$/, '');

  // Strip trailing /api if present in base URL to avoid /api/api duplication
  url = url.replace(/\/api$/i, '');

  // Fix malformed protocol schemes like "https//", "https:/", "http//", "http:/"
  if (/^https?:?\/*/i.test(url)) {
    url = url.replace(/^(https?):?\/*/i, '$1://');
  } else {
    url = `https://${url}`;
  }

  return url.replace(/\/+$/, '');
};

const getBaseUrl = (): string => {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (config.baseURL) {
    config.baseURL = normalizeApiBaseUrl(config.baseURL);
  }
  console.log('[RAG DEBUG] API request:', {
    baseURL: config.baseURL,
    url: config.url,
    method: config.method,
    data: config.data
  });
  return config;
}, (error) => {
  console.error('[RAG DEBUG] Request error before send:', error);
  return Promise.reject(error);
});

apiClient.interceptors.response.use((response) => {
  console.log('[RAG DEBUG] API response:', response);
  return response;
}, (error) => {
  console.error('[RAG DEBUG] API ERROR:', error);
  console.error('[RAG DEBUG] ERROR MESSAGE:', error?.message);
  console.error('[RAG DEBUG] ERROR RESPONSE:', error?.response);
  console.error('[RAG DEBUG] ERROR REQUEST:', error?.request);
  return Promise.reject(error);
});
