// ═══════════════════════════════════════════════════════════════
// OpenAI Provider — LLM integration using structured output
// ═══════════════════════════════════════════════════════════════

import OpenAI from 'openai';
import { openaiConfig } from '../../config';
import { createModuleLogger } from '../../utils';

const log = createModuleLogger('openai-provider');

interface StructuredResponse {
  text: string;
  hashtags: string[];
  model: string;
  tokensUsed: number;
}

class OpenAIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: openaiConfig.apiKey });
  }

  /**
   * Generate content with structured JSON output.
   */
  async generateStructured(systemPrompt: string, userPrompt: string): Promise<StructuredResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: openaiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 1000,
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
  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: openaiConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || '';
  }
}

export const openaiProvider = new OpenAIProvider();
