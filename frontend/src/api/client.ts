import axios from 'axios';

const getBaseUrl = (): string => {
  const rawUrl = import.meta.env.VITE_API_BASE_URL;
  let url = (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') 
    ? rawUrl.trim() 
    : 'http://127.0.0.1:8000';

  // Strip trailing slashes
  url = url.replace(/\/+$/, '');

  // Fix malformed protocol schemes like "https//", "https:/", "http//", "http:/"
  if (/^https?:?\/*/i.test(url)) {
    url = url.replace(/^(https?):?\/*/i, '$1://');
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  return url;
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
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
