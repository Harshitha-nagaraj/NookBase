import { apiClient } from './client';
import type { EvaluationResponse, OptimizationExperimentResponse } from '../types/api';

export const evaluationApi = {
  getEvaluation: async (): Promise<EvaluationResponse> => {
    const { data } = await apiClient.get('/api/evaluation');
    return data;
  },
  
  getOptimizationExperiment: async (): Promise<OptimizationExperimentResponse> => {
    const { data } = await apiClient.get('/api/experiments/optimization');
    return data;
  }
};
