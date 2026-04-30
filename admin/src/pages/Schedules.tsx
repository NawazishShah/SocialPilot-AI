import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import api from '../lib/api';

interface Schedule {
  id: string;
  accountId: string;
  cronExpression: string;
  timezone: string;
  contentConfig: {
    topic: string;
    tone: string;
  } | null;
  status: 'active' | 'paused' | 'completed';
  runCount: number;
  maxRuns: number | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  account: {
    username: string;
    platform: string;
    displayName: string | null;
  } | null;
  metadata: {
    autoPublish?: boolean;
    cadence?: string;
    dailyHour?: number;
    dailyMinute?: number;
  } | null;
}

export default function Schedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    accountId: '',
    cadence: 'daily' as 'hourly' | 'daily' | 'random',
    dailyHour: 9,
    dailyMinute: 0,
    timezone: 'Asia/Karachi',
    topic: '',
    tone: 'professional',
    autoPublish: true,
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/schedules');
      setSchedules(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/schedules', {
        accountId: formData.accountId,
        cadence: formData.cadence,
        dailyHour: formData.cadence === 'daily' ? formData.dailyHour : undefined,
        dailyMinute: formData.cadence === 'daily' ? formData.dailyMinute : undefined,
        timezone: formData.timezone,
        contentConfig: {
          topic: formData.topic,
          tone: formData.tone,
        },
        autoPublish: formData.autoPublish,
      });
      setShowForm(false);
      fetchSchedules();
    } catch (error) {
      console.error('Failed to create schedule:', error);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === 'active') {
        await api.put(`/schedules/${id}/pause`);
      } else {
        await api.put(`/schedules/${id}/resume`);
      }
      fetchSchedules();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  const runNow = async (scheduleId: string) => {
    try {
      await api.post('/pipeline/run', { scheduleId });
      alert('Job enqueued! Check Logs for progress.');
      fetchSchedules();
    } catch (error) {
      console.error('Failed to run schedule:', error);
      alert('Failed to run schedule. Check console for details.');
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      fetchSchedules();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Schedules</h1>
        <Button onClick={() => setShowForm(true)}>Add Schedule</Button>
      </div>

      {showForm && (
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Create Schedule</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Account ID</label>
              <input
                type="text"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="Enter account ID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cadence</label>
              <select
                value={formData.cadence}
                onChange={(e) => setFormData({ ...formData, cadence: e.target.value as any })}
                className="w-full p-2 border rounded"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="random">Random</option>
              </select>
            </div>
            {formData.cadence === 'daily' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Hour</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={formData.dailyHour}
                    onChange={(e) => setFormData({ ...formData, dailyHour: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Minute</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={formData.dailyMinute}
                    onChange={(e) => setFormData({ ...formData, dailyMinute: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Topic</label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="What to post about"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tone</label>
              <select
                value={formData.tone}
                onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="witty">Witty</option>
                <option value="inspirational">Inspirational</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoPublish"
                checked={formData.autoPublish}
                onChange={(e) => setFormData({ ...formData, autoPublish: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="autoPublish" className="text-sm">Auto-publish</label>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {schedules.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">No schedules found. Click "Add Schedule" to create one.</Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge status={schedule.status === 'active' ? 'success' : schedule.status === 'paused' ? 'pending' : 'archived'} />
                    <span className="text-sm text-gray-500">{schedule.metadata?.cadence || schedule.cronExpression}</span>
                  </div>
                  <h3 className="font-semibold">{schedule.contentConfig?.topic || 'No topic'}</h3>
                  <p className="text-sm text-gray-600">
                    Account: {schedule.account?.username || schedule.accountId} ({schedule.account?.platform || 'unknown'})
                  </p>
                  <p className="text-sm text-gray-600">
                    Cron: {schedule.cronExpression} | Timezone: {schedule.timezone}
                  </p>
                  <p className="text-sm text-gray-600">
                    Runs: {schedule.runCount}{schedule.maxRuns ? `/${schedule.maxRuns}` : ''} |
                    Auto-publish: {schedule.metadata?.autoPublish !== false ? 'Yes' : 'No'}
                  </p>
                  {schedule.nextRunAt && (
                    <p className="text-sm text-gray-500">
                      Next run: {new Date(schedule.nextRunAt).toLocaleString()}
                    </p>
                  )}
                  {schedule.lastRunAt && (
                    <p className="text-sm text-gray-500">
                      Last run: {new Date(schedule.lastRunAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {schedule.status === 'active' && (
                    <Button variant="success" onClick={() => runNow(schedule.id)}>Run Now</Button>
                  )}
                  <Button variant="secondary" onClick={() => toggleStatus(schedule.id, schedule.status)}>
                    {schedule.status === 'active' ? 'Pause' : 'Resume'}
                  </Button>
                  <Button variant="danger" onClick={() => deleteSchedule(schedule.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
