// ═══════════════════════════════════════════════════════════════
// Platform Adapter — base interface + adapter registry
// ═══════════════════════════════════════════════════════════════

import { Page } from 'playwright';
import type { Platform } from '../../config/constants';
import { TwitterAdapter } from './twitter.adapter';

// ─── Adapter Interface ───────────────────────────────────────

export interface PostResult {
  postUrl: string | null;
  success: boolean;
}

export interface PlatformAdapter {
  platform: Platform;
  login(page: Page, credentials: Record<string, string>): Promise<void>;
  publishText(page: Page, content: string): Promise<PostResult>;
  isSessionValid(page: Page): Promise<boolean>;
}

// ─── Adapter Registry ────────────────────────────────────────

const adapters: Partial<Record<Platform, PlatformAdapter>> = {
  twitter: new TwitterAdapter(),
  // linkedin: new LinkedInAdapter(),
  // instagram: new InstagramAdapter(),
  // facebook: new FacebookAdapter(),
};

export function getAdapter(platform: Platform): PlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`No adapter implemented for platform: ${platform}`);
  }
  return adapter;
}
