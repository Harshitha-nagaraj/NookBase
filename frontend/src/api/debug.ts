import { apiClient } from './client';
import type { DebugResponse, CompareResponse, HealthResponse, SecurityResponse, RetrievalExperimentResponse, RetrievalExperimentConfigItem, CounterfactualResponse } from '../types/api';


export const debugApi = {
  checkHealth: async (): Promise<HealthResponse> => {
    const { data } = await apiClient.get('/api/health');
    return data;
  },
  
  runDebug: async (
    query: string,
    topK: number = 5,
    strategy: string = 'standard',
    threshold: number = 0.35
  ): Promise<DebugResponse> => {
    const { data } = await apiClient.post('/api/debug', {
      query,
      top_k: topK,
      strategy,
      threshold
    });
    return data;
  },

  runRetrievalExperiment: async (
    query: string,
    configurations: RetrievalExperimentConfigItem[]
  ): Promise<RetrievalExperimentResponse> => {
    const { data } = await apiClient.post('/api/debug/retrieval-experiment', {
      query,
      configurations
    });
    return data;
  },
  
  comparePipelines: async (query: string, topK: number = 5): Promise<CompareResponse> => {
    const { data } = await apiClient.post('/api/debug/compare', { query, top_k: topK });
    return data;
  },

  getSecurity: async (query: string, topK: number = 5): Promise<SecurityResponse> => {
    const { data } = await apiClient.post('/api/debug/security', { query, top_k: topK });
    return data;
  },

  runCounterfactual: async (
    query: string,
    topK: number = 5,
    strategy: string = 'standard',
    threshold: number = 0.35
  ): Promise<CounterfactualResponse> => {
    const { data } = await apiClient.post('/api/debug/counterfactual', {
      query,
      top_k: topK,
      strategy,
      threshold
    });
    return data;
  }
};


