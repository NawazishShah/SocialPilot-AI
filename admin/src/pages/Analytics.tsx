import { useEffect, useState } from 'react';
import { analyticsApi } from '../lib/api';
import { AnalyticsData, AnalyticsSummary } from '../types';
import Card from '../components/Card';
import { Loader2, TrendingUp, Eye, Heart, MessageCircle, Share2 } from 'lucide-react';

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadAnalytics();
  }, [page]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        analyticsApi.list({ page, limit: 20 }),
        analyticsApi.summary(),
      ]);
      setAnalytics(listRes.data.data);
      setTotalPages(listRes.data.pagination.totalPages);
      setSummary(summaryRes.data.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-blue-100">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Views</p>
              <p className="text-lg font-semibold text-gray-900">
                {summary.totals.views.toLocaleString()}
              </p>
            </div>
          </Card>

          <Card className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-red-100">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Likes</p>
              <p className="text-lg font-semibold text-gray-900">
                {summary.totals.likes.toLocaleString()}
              </p>
            </div>
          </Card>

          <Card className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-green-100">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Comments</p>
              <p className="text-lg font-semibold text-gray-900">
                {summary.totals.comments.toLocaleString()}
              </p>
            </div>
          </Card>

          <Card className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-purple-100">
              <Share2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Shares</p>
              <p className="text-lg font-semibold text-gray-900">
                {summary.totals.shares.toLocaleString()}
              </p>
            </div>
          </Card>
        </div>
      )}

      {summary && (
        <Card title="Averages">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Avg. Views</p>
              <p className="text-xl font-semibold text-gray-900">
                {summary.averages.views.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Likes</p>
              <p className="text-xl font-semibold text-gray-900">
                {summary.averages.likes.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Comments</p>
              <p className="text-xl font-semibold text-gray-900">
                {summary.averages.comments.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Shares</p>
              <p className="text-xl font-semibold text-gray-900">
                {summary.averages.shares.toFixed(1)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Total posts tracked: <span className="font-semibold text-gray-900">{summary.count}</span>
            </p>
          </div>
        </Card>
      )}

      <Card title="Recent Analytics">
        {analytics.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No analytics data found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Platform</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Views</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Likes</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Comments</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Shares</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900 capitalize">{item.platform}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.views.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.likes.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.comments.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.shares.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(item.recordedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center space-x-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
