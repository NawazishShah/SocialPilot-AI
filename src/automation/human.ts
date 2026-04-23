import type { Locator, Page } from 'playwright';
import { randomDelay, sleep } from '../utils';

export function randomDelayBetweenActions(minMs = 400, maxMs = 1400): Promise<void> {
  return sleep(randomDelay(minMs, maxMs));
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function simulateHumanTyping(
  target: Page | Locator,
  text: string,
  options?: {
    minDelayMs?: number;
    maxDelayMs?: number;
    mistakeRate?: number;
    pauseRate?: number;
    pauseMinMs?: number;
    pauseMaxMs?: number;
  }
): Promise<void> {
  const minDelayMs = options?.minDelayMs ?? 25;
  const maxDelayMs = options?.maxDelayMs ?? 140;
  const mistakeRate = options?.mistakeRate ?? 0.02;
  const pauseRate = options?.pauseRate ?? 0.04;
  const pauseMinMs = options?.pauseMinMs ?? 250;
  const pauseMaxMs = options?.pauseMaxMs ?? 1200;

  const keyboard = 'keyboard' in target ? target.keyboard : null;

  for (const ch of text) {
    if (Math.random() < pauseRate) {
      await sleep(randomDelay(pauseMinMs, pauseMaxMs));
    }

    if (Math.random() < mistakeRate && keyboard) {
      const typo = String.fromCharCode(clamp(ch.charCodeAt(0) + (Math.random() < 0.5 ? -1 : 1), 32, 126));
      await keyboard.type(typo, { delay: randomDelay(minDelayMs, maxDelayMs) });
      await sleep(randomDelay(80, 240));
      await keyboard.press('Backspace', { delay: randomDelay(10, 60) });
      await sleep(randomDelay(40, 120));
    }

    if (keyboard) {
      await keyboard.type(ch, { delay: randomDelay(minDelayMs, maxDelayMs) });
    } else {
      await (target as Locator).type(ch, { delay: randomDelay(minDelayMs, maxDelayMs) });
    }
  }
}

export async function moveMouseHumanLike(
  page: Page,
  options?: {
    steps?: number;
    maxJitterPx?: number;
  }
): Promise<void> {
  const steps = options?.steps ?? randomDelay(12, 30);
  const maxJitterPx = options?.maxJitterPx ?? 8;

  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
  const startX = rand(50, viewport.width - 50);
  const startY = rand(50, viewport.height - 50);
  const endX = rand(50, viewport.width - 50);
  const endY = rand(50, viewport.height - 50);

  await page.mouse.move(startX, startY);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = t * t * (3 - 2 * t);

    const x = startX + (endX - startX) * ease + rand(-maxJitterPx, maxJitterPx);
    const y = startY + (endY - startY) * ease + rand(-maxJitterPx, maxJitterPx);

    await page.mouse.move(x, y);
    await sleep(randomDelay(8, 28));
  }

  if (Math.random() < 0.15) {
    await sleep(randomDelay(250, 900));
  }
}

export async function scrollHumanLike(
  page: Page,
  options?: {
    minSteps?: number;
    maxSteps?: number;
  }
): Promise<void> {
  const minSteps = options?.minSteps ?? 3;
  const maxSteps = options?.maxSteps ?? 8;
  const steps = randomDelay(minSteps, maxSteps);

  for (let i = 0; i < steps; i++) {
    const deltaY = randomDelay(120, 520) * (Math.random() < 0.15 ? -1 : 1);
    await page.mouse.wheel(0, deltaY);
    await sleep(randomDelay(150, 650));
  }
}
