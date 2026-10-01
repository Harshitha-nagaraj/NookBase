import axios from 'axios';

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return 'http://127.0.0.1:8000';
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
