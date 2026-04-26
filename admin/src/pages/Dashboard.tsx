import { useEffect, useState } from 'react';
import { engineApi, contentApi, analyticsApi } from '../lib/api';
import { EngineStatus, AnalyticsSummary } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { Power, FileText, TrendingUp, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [engineRes, contentRes, analyticsRes] = await Promise.all([
        engineApi.getStatus(),
        contentApi.list({ status: 'draft', limit: 1 }),
        analyticsApi.summary(),
      ]);
      setEngineStatus(engineRes.data.data);
      setDraftCount(contentRes.data.pagination.total);
      setAnalytics(analyticsRes.data.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEngineToggle = async () => {
    try {
      if (engineStatus?.enabled) {
        await engineApi.stop();
        setEngineStatus({ enabled: false });
      } else {
        await engineApi.start();
        setEngineStatus({ enabled: true });
      }
    } catch (error) {
      console.error('Failed to toggle engine:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex items-center space-x-4">
          <div className={`p-3 rounded-full ${engineStatus?.enabled ? 'bg-green-100' : 'bg-red-100'}`}>
            <Power className={`w-6 h-6 ${engineStatus?.enabled ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Engine Status</p>
            <p className="text-lg font-semibold text-gray-900">
              {engineStatus?.enabled ? 'Running' : 'Stopped'}
            </p>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="p-3 rounded-full bg-yellow-100">
            <FileText className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Approval</p>
            <p className="text-lg font-semibold text-gray-900">{draftCount}</p>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="p-3 rounded-full bg-blue-100">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Views</p>
            <p className="text-lg font-semibold text-gray-900">
              {analytics?.totals.views.toLocaleString() || 0}
            </p>
          </div>
        </Card>

        <Card className="flex items-center space-x-4">
          <div className="p-3 rounded-full bg-purple-100">
            <AlertCircle className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg. Engagement</p>
            <p className="text-lg font-semibold text-gray-900">
              {analytics?.averages.likes.toFixed(1) || 0}
            </p>
          </div>
        </Card>
      </div>

      <Card title="Engine Control">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">
              {engineStatus?.enabled 
                ? 'The automation engine is currently running and will post content according to schedules.'
                : 'The automation engine is stopped. No posts will be scheduled automatically.'}
            </p>
          </div>
          <Button 
            variant={engineStatus?.enabled ? 'danger' : 'success'}
            onClick={handleEngineToggle}
          >
            {engineStatus?.enabled ? 'Stop Engine' : 'Start Engine'}
          </Button>
        </div>
      </Card>

      <Card title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="secondary" className="w-full justify-center">
            View Pending Posts
          </Button>
          <Button variant="secondary" className="w-full justify-center">
            View Recent Logs
          </Button>
          <Button variant="secondary" className="w-full justify-center">
            Add New Topic
          </Button>
        </div>
      </Card>
    </div>
  );
}
