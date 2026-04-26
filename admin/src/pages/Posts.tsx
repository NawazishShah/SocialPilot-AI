import { useEffect, useState } from 'react';
import { contentApi } from '../lib/api';
import { Content } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Check, X, Loader2 } from 'lucide-react';

export default function Posts() {
  const [posts, setPosts] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>('draft');

  useEffect(() => {
    loadPosts();
  }, [page, filter]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await contentApi.list({ status: filter, page, limit: 20 });
      setPosts(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await contentApi.approve(id);
      loadPosts();
    } catch (error) {
      console.error('Failed to approve post:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await contentApi.reject(id);
      loadPosts();
    } catch (error) {
      console.error('Failed to reject post:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
        <div className="flex space-x-2">
          {['draft', 'approved', 'posted', 'archived'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'primary' : 'secondary'}
              onClick={() => { setFilter(status); setPage(1); }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No posts found</div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge status={post.status as any} />
                      <span className="text-sm text-gray-500">{post.platform}</span>
                      <span className="text-sm text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-900">{post.text}</p>
                  </div>
                  {post.status === 'draft' && (
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleApprove(post.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(post.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center space-x-2 mt-6">
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
