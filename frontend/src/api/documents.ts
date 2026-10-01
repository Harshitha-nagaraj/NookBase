import { apiClient } from './client';
import type { DocumentResponse } from '../types/api';

export const documentsApi = {
  getDocuments: async (): Promise<DocumentResponse> => {
    const { data } = await apiClient.get('/api/documents');
    return data;
  },
  
  uploadDocument: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const { data } = await apiClient.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  }
};
