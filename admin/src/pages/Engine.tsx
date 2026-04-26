import { useEffect, useState } from 'react';
import { engineApi } from '../lib/api';
import { EngineStatus } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { Power, Play, Square, Loader2 } from 'lucide-react';

export default function Engine() {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await engineApi.getStatus();
      setStatus(res.data.data);
    } catch (error) {
      console.error('Failed to load engine status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      if (status?.enabled) {
        await engineApi.stop();
        setStatus({ enabled: false });
      } else {
        await engineApi.start();
        setStatus({ enabled: true });
      }
    } catch (error) {
      console.error('Failed to toggle engine:', error);
    } finally {
      setToggling(false);
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
      <h1 className="text-2xl font-bold text-gray-900">Engine Control</h1>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-4 rounded-full ${status?.enabled ? 'bg-green-100' : 'bg-red-100'}`}>
              <Power className={`w-8 h-8 ${status?.enabled ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Automation Engine
              </h2>
              <p className={`text-lg ${status?.enabled ? 'text-green-600' : 'text-red-600'}`}>
                {status?.enabled ? 'Running' : 'Stopped'}
              </p>
            </div>
          </div>
          <Button
            variant={status?.enabled ? 'danger' : 'success'}
            onClick={handleToggle}
            disabled={toggling}
            className="flex items-center space-x-2"
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : status?.enabled ? (
              <>
                <Square className="w-4 h-4" />
                <span>Stop Engine</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Engine</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card title="Engine Information">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Current Status</h3>
            <p className="text-gray-600">
              {status?.enabled
                ? 'The automation engine is active. It will automatically schedule and post content according to your configured schedules.'
                : 'The automation engine is inactive. No content will be scheduled or posted automatically.'}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">What happens when stopped?</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>No new posts will be scheduled</li>
              <li>Existing scheduled jobs will be paused</li>
              <li>You can still manually trigger posts</li>
              <li>Configuration changes remain saved</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">What happens when started?</h3>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Scheduler will resume processing schedules</li>
              <li>New posts will be generated and queued</li>
              <li>Posts will be published at scheduled times</li>
              <li>Automation logs will be recorded</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
