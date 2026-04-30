// ═══════════════════════════════════════════════════════════════
// OpenAI Provider — LLM integration using structured output
// ═══════════════════════════════════════════════════════════════

import OpenAI from 'openai';
import { openaiConfig } from '../../config';
import { createModuleLogger } from '../../utils';
import type { GenerateOptions, StructuredContentResponse, TextResponse } from './types';

const log = createModuleLogger('openai-provider');

class OpenAIProvider {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (this.client) return this.client;
    if (!openaiConfig.apiKey) {
      throw new Error('OPENAI_API_KEY is missing. Set AI_PROVIDER=ollama to use local LLM, or provide OPENAI_API_KEY.');
    }
    const options: ConstructorParameters<typeof OpenAI>[0] = { apiKey: openaiConfig.apiKey };
    if (openaiConfig.baseUrl) {
      options.baseURL = openaiConfig.baseUrl;
    }
    this.client = new OpenAI(options);
    return this.client;
  }

  /**
   * Generate content with structured JSON output.
   */
  async generateStructured(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions
  ): Promise<StructuredContentResponse> {
    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model: openaiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: options?.temperature ?? 0.8,
        max_tokens: options?.maxTokens ?? 1000,
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(choice.message.content) as {
        text?: string;
        hashtags?: string[];
      };

      return {
        text: parsed.text || '',
        hashtags: parsed.hashtags || [],
        model: openaiConfig.model,
        tokensUsed: response.usage?.total_tokens || 0,
      };
    } catch (err) {
      log.error({ err }, 'OpenAI API call failed');
      throw err;
    }
  }

  /**
   * Simple text completion (non-structured).
   */
  async generateText(systemPrompt: string, userPrompt: string, options?: GenerateOptions): Promise<TextResponse> {
    const client = this.getClient();
    const response = await client.chat.completions.create({
      model: openaiConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.8,
      max_tokens: options?.maxTokens ?? 1000,
    });

    return {
      text: response.choices[0]?.message?.content || '',
      model: openaiConfig.model,
      tokensUsed: response.usage?.total_tokens || 0,
    };
  }
}

export const openaiProvider = new OpenAIProvider();
