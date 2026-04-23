// ═══════════════════════════════════════════════════════════════
// AI Content Generator — orchestrates LLM calls for content
// ═══════════════════════════════════════════════════════════════

import { openaiProvider } from './providers/openai.provider';
import { getPromptTemplate } from './prompts';
import { createModuleLogger } from '../utils';
import { PLATFORM_LIMITS, type Platform, type ContentType, type Tone } from '../config/constants';

const log = createModuleLogger('ai-generator');

export interface GenerateInput {
  platform: Platform;
  contentType: ContentType;
  topic: string;
  tone: Tone;
  additionalContext?: string;
}

export interface GenerateResult {
  text: string;
  hashtags: string[];
  model: string;
  tokensUsed: number;
  latencyMs: number;
}

class AIGenerator {
  /**
   * Generate platform-specific social media content.
   */
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const startTime = Date.now();
    const limits = PLATFORM_LIMITS[input.platform];

    // ─── Build the prompt ────────────────────────────────────
    const systemPrompt = getPromptTemplate(input.platform, input.contentType);

    const userPrompt = [
      `Topic: ${input.topic}`,
      `Tone: ${input.tone}`,
      `Platform: ${input.platform}`,
      `Character limit: ${limits.maxChars}`,
      `Max hashtags: ${limits.maxHashtags}`,
      input.additionalContext ? `Additional context: ${input.additionalContext}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    // ─── Call the LLM ────────────────────────────────────────
    log.info({ platform: input.platform, topic: input.topic }, 'Calling AI provider...');

    const response = await openaiProvider.generateStructured(systemPrompt, userPrompt);

    const latencyMs = Date.now() - startTime;

    // ─── Validate output against platform constraints ────────
    let text = response.text;
    if (text.length > limits.maxChars) {
      log.warn(
        { textLength: text.length, limit: limits.maxChars },
        'Generated text exceeds platform limit, truncating'
      );
      text = text.substring(0, limits.maxChars - 3) + '...';
    }

    let hashtags = response.hashtags.slice(0, limits.maxHashtags);

    log.info(
      { platform: input.platform, chars: text.length, hashtags: hashtags.length, latencyMs },
      'Content generated successfully'
    );

    return {
      text,
      hashtags,
      model: response.model,
      tokensUsed: response.tokensUsed,
      latencyMs,
    };
  }
}

export const aiGenerator = new AIGenerator();
