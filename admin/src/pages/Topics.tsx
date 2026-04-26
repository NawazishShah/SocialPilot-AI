import { useEffect, useState } from 'react';
import { topicsApi } from '../lib/api';
import { Topic } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { Plus, Trash2, Loader2, Search } from 'lucide-react';

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newPlatform, setNewPlatform] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadTopics();
  }, [page, search]);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.q = search;
      const res = await topicsApi.list(params);
      setTopics(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;

    setAdding(true);
    try {
      await topicsApi.create({ text: newTopic, platform: newPlatform || undefined });
      setNewTopic('');
      setNewPlatform('');
      loadTopics();
    } catch (error) {
      console.error('Failed to add topic:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await topicsApi.delete(id);
      loadTopics();
    } catch (error) {
      console.error('Failed to delete topic:', error);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Topics</h1>

      <Card title="Add New Topic">
        <form onSubmit={handleAdd} className="flex space-x-4">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Enter topic text..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Platforms</option>
            <option value="twitter">Twitter</option>
            <option value="linkedin">LinkedIn</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </select>
          <Button type="submit" disabled={adding || !newTopic.trim()}>
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search topics..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No topics found</div>
        ) : (
          <div className="space-y-2">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-gray-900 font-medium">{topic.text}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    {topic.platform && (
                      <span className="text-sm text-gray-500 capitalize">{topic.platform}</span>
                    )}
                    <span className="text-sm text-gray-400">
                      {new Date(topic.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(topic.id)}
                  disabled={deleting === topic.id}
                >
                  {deleting === topic.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
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
