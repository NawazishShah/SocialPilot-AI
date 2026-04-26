import { useEffect, useState } from 'react';
import { logsApi } from '../lib/api';
import { PostLog } from '../types';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { Loader2 } from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState<PostLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, [page, filter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filter) params.status = filter;
      const res = await logsApi.list(params);
      setLogs(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Automation Logs</h1>
        <div className="flex space-x-2">
          {['', 'pending', 'posted', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => { setFilter(status); setPage(1); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Platform</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Content ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Error</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Posted At</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Badge status={log.status as any} />
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{log.platform}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 font-mono">{log.contentId}</td>
                    <td className="py-3 px-4 text-sm text-red-600 max-w-xs truncate">
                      {log.errorMessage || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {log.postedAt ? new Date(log.postedAt).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(log.createdAt).toLocaleString()}
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
