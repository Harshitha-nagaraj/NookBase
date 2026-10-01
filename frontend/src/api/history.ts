import { apiClient } from './client';
import type { RunHistoryListResponse, RunDetailResponse } from '../types/api';

export const historyApi = {
  getRuns: async (limit: number = 50, offset: number = 0): Promise<RunHistoryListResponse> => {
    const res = await apiClient.get<RunHistoryListResponse>('/api/runs', {
      params: { limit, offset }
    });
    return res.data;
  },

  getRun: async (runId: string): Promise<RunDetailResponse> => {
    const res = await apiClient.get<RunDetailResponse>(`/api/runs/${encodeURIComponent(runId)}`);
    return res.data;
  },

  deleteRun: async (runId: string): Promise<{ status: string; run_id: string }> => {
    const res = await apiClient.delete<{ status: string; run_id: string }>(`/api/runs/${encodeURIComponent(runId)}`);
    return res.data;
  }
};
