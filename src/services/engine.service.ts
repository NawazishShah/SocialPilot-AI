import { getRedisConnection } from '../config/redis';

const ENGINE_ENABLED_KEY = 'engine:enabled';

class EngineService {
  async isEnabled(): Promise<boolean> {
    const redis = getRedisConnection();
    const value = await redis.get(ENGINE_ENABLED_KEY);
    if (value === null) return true;
    return value === '1' || value === 'true';
  }

  async setEnabled(enabled: boolean): Promise<void> {
    const redis = getRedisConnection();
    await redis.set(ENGINE_ENABLED_KEY, enabled ? '1' : '0');
  }
}

export const engineService = new EngineService();
