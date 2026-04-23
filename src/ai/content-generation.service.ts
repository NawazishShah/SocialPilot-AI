import type { Platform } from '../config/constants';
import { PLATFORM_LIMITS } from '../config/constants';
import { getPromptTemplate } from './prompts';
import { getStyleInstructions, type PostStyle } from './prompts/styles';
import { getLLMProvider, type AIProviderName } from './providers/provider.factory';
import type { LLMProvider } from './providers/types';
import { createModuleLogger } from '../utils';
import { prisma } from '../services/database';
import { maxSimilarity } from './utils/similarity';

const log = createModuleLogger('ai-content-generator-service');

export interface GeneratePostInput {
  topic: string;
  platform: Platform;
  style: PostStyle;
  additionalContext?: string;
  provider?: AIProviderName;
}

export interface GeneratePostOutput {
  text: string;
  hashtags: string[];
  model: string;
  tokensUsed: number;
  latencyMs: number;
  similarityMax: number;
}

export class AIContentGeneratorService {
  private readonly provider: LLMProvider;

  constructor(provider?: LLMProvider) {
    this.provider = provider ?? getLLMProvider();
  }

  async generateHighEngagementPost(input: GeneratePostInput): Promise<GeneratePostOutput> {
    const start = Date.now();
    const provider = input.provider ? getLLMProvider(input.provider) : this.provider;

    const limits = PLATFORM_LIMITS[input.platform];
    const styleInstructions = getStyleInstructions(input.style);

    const recent = await this.getRecentPosts(input.platform);

    const systemPrompt = [
      getPromptTemplate(input.platform, 'text'),
      styleInstructions,
      `ANTI-REPETITION RULES:\n- Avoid reusing the same opening line structure\n- Avoid repeating the same phrasing from recent posts\n- Use fresh examples and wording\n- Output must be original and non-derivative`,
      `Return JSON exactly: { "text": string, "hashtags": string[] }`,
    ].join('\n\n');

    const userPromptBase = [
      `Topic: ${input.topic}`,
      `Platform: ${input.platform}`,
      `Character limit: ${limits.maxChars}`,
      `Max hashtags: ${limits.maxHashtags}`,
      input.additionalContext ? `Additional context: ${input.additionalContext}` : '',
      recent.length > 0 ? `Recent posts to avoid being similar to:\n${recent.map((t, i) => `#${i + 1}: ${t}`).join('\n\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const maxAttempts = 3;
    let lastSimilarity = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const userPrompt =
        attempt === 1
          ? userPromptBase
          : `${userPromptBase}\n\nAttempt ${attempt} instruction: Make the post significantly different in structure, wording, and examples. Use a different hook approach.`;

      const response = await provider.generateStructured(systemPrompt, userPrompt, {
        temperature: attempt === 1 ? 0.85 : 0.95,
        maxTokens: 900,
      });

      let text = (response.text || '').trim();
      const hashtags = (response.hashtags || []).slice(0, limits.maxHashtags);

      if (text.length > limits.maxChars) {
        text = text.substring(0, limits.maxChars - 3) + '...';
      }

      const similarity = recent.length ? maxSimilarity(text, recent).max : 0;
      lastSimilarity = similarity;

      const threshold = input.platform === 'twitter' ? 0.28 : 0.22;
      const acceptable = similarity <= threshold;

      log.info(
        { platform: input.platform, style: input.style, attempt, similarity, acceptable },
        'Generated candidate post'
      );

      if (acceptable || attempt === maxAttempts) {
        return {
          text,
          hashtags,
          model: response.model,
          tokensUsed: response.tokensUsed,
          latencyMs: Date.now() - start,
          similarityMax: similarity,
        };
      }
    }

    throw new Error('Failed to generate a non-repetitive post');
  }

  async rewriteHumanize(text: string, options?: { preserveHashtags?: boolean; provider?: AIProviderName }): Promise<string> {
    const provider = options?.provider ? getLLMProvider(options.provider) : this.provider;

    const systemPrompt = `You are an expert editor. Rewrite text to sound human, natural, and original.\nRULES:\n- Keep meaning the same\n- Reduce AI-like patterns and repetition\n- Keep it engaging\n- No clichés or generic filler\n- Output ONLY the rewritten text (no quotes, no markdown).`;

    const userPrompt = options?.preserveHashtags
      ? `Rewrite and humanize the following. Keep hashtags intact and in the same order.\n\nTEXT:\n${text}`
      : `Rewrite and humanize the following.\n\nTEXT:\n${text}`;

    const result = await provider.generateText(systemPrompt, userPrompt, { temperature: 0.7, maxTokens: 900 });
    return result.text.trim();
  }

  private async getRecentPosts(platform: Platform): Promise<string[]> {
    try {
      const rows = await prisma.content.findMany({
        where: {
          platform,
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: { body: true },
      });

      return rows.map((r) => r.body).filter(Boolean);
    } catch (err) {
      log.warn({ err }, 'Failed to load recent posts for anti-repetition; continuing without DB history');
      return [];
    }
  }
}

export const aiContentGeneratorService = new AIContentGeneratorService();
