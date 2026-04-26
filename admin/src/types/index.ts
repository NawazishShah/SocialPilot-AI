export interface Content {
  id: string;
  text: string;
  platform: string;
  status: 'draft' | 'approved' | 'posted' | 'archived' | 'failed';
  accountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostLog {
  id: string;
  accountId: string;
  scheduleId?: string;
  contentId: string;
  status: 'pending' | 'posted' | 'failed';
  platform: string;
  errorMessage?: string;
  postedAt?: string;
  createdAt: string;
}

export interface AnalyticsData {
  id: string;
  accountId: string;
  contentId: string;
  likes: number;
  shares: number;
  comments: number;
  views: number;
  platform: string;
  recordedAt: string;
}

export interface Topic {
  id: string;
  text: string;
  platform?: string;
  createdAt: string;
}

export interface EngineStatus {
  enabled: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AnalyticsSummary {
  totals: {
    likes: number;
    shares: number;
    comments: number;
    views: number;
  };
  averages: {
    likes: number;
    shares: number;
    comments: number;
    views: number;
  };
  count: number;
}
