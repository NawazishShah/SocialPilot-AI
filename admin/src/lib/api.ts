import axios from 'axios';
import {
  Content,
  PostLog,
  AnalyticsData,
  Topic,
  EngineStatus,
  PaginatedResponse,
  AnalyticsSummary,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add API key from localStorage if available
api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    // Use .set() for modern Axios, fallback to direct assignment for older versions
    if (config.headers.set) {
      config.headers.set('x-api-key', apiKey);
    } else {
      (config.headers as any)['x-api-key'] = apiKey;
    }
    console.log('[API Client] Attaching API Key:', `${apiKey.substring(0, 4)}...`);
  } else {
    console.warn('[API Client] No API Key found in localStorage');
  }
  return config;
});

// Content API
export const contentApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Content>>('/content', { params }),
  approve: (id: string) => api.put<{ data: Content }>(`/content/${id}/approve`),
  reject: (id: string) => api.put<{ data: Content }>(`/content/${id}/reject`),
  archive: (id: string) => api.put<{ data: Content }>(`/content/${id}/archive`),
  delete: (id: string) => api.delete(`/content/${id}`),
};

// Engine API
export const engineApi = {
  getStatus: () => api.get<{ data: EngineStatus }>('/engine/status'),
  start: () => api.post<{ data: EngineStatus }>('/engine/start'),
  stop: () => api.post<{ data: EngineStatus }>('/engine/stop'),
};

// Logs API
export const logsApi = {
  list: (params?: {
    accountId?: string;
    status?: string;
    platform?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<PostLog>>('/logs', { params }),
};

// Analytics API
export const analyticsApi = {
  list: (params?: {
    accountId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => api.get<PaginatedResponse<AnalyticsData>>('/analytics', { params }),
  summary: (params?: { accountId?: string; from?: string; to?: string }) =>
    api.get<{ data: AnalyticsSummary }>('/analytics/summary', { params }),
};

// Topics API
export const topicsApi = {
  list: (params?: { q?: string; platform?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Topic>>('/topics', { params }),
  create: (data: { text: string; platform?: string }) =>
    api.post<{ data: Topic }>('/topics', data),
  delete: (id: string) => api.delete(`/topics/${id}`),
};

export default api;
