import { createModuleLogger } from '../../utils';
import type { GenerateOptions, LLMProvider, StructuredContentResponse, TextResponse } from './types';
import { env } from '../../config';

const log = createModuleLogger('ollama-provider');

type OllamaChatResponse = {
  model: string;
  created_at: string;
  message?: { role: string; content: string };
  response?: string;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
};

function getOllamaBaseUrl(): string {
  const base = env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  return base.replace(/\/$/, '');
}

function getOllamaModel(): string {
  return env.OLLAMA_MODEL || 'llama3.1';
}

async function parseJsonObjectFromText(text: string): Promise<Record<string, unknown>> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first >= 0 && last > first) {
      const candidate = trimmed.slice(first, last + 1);
      return JSON.parse(candidate) as Record<string, unknown>;
    }
    throw new Error('Failed to parse JSON from Ollama response');
  }
}

class OllamaProvider implements LLMProvider {
  async generateStructured(systemPrompt: string, userPrompt: string, options?: GenerateOptions): Promise<StructuredContentResponse> {
    const result = await this.generateText(systemPrompt, userPrompt, options);
    const parsed = (await parseJsonObjectFromText(result.text)) as { text?: unknown; hashtags?: unknown };

    return {
      text: typeof parsed.text === 'string' ? parsed.text : '',
      hashtags: Array.isArray(parsed.hashtags) ? (parsed.hashtags.filter((x) => typeof x === 'string') as string[]) : [],
      model: result.model,
      tokensUsed: result.tokensUsed,
    };
  }

  async generateText(systemPrompt: string, userPrompt: string, options?: GenerateOptions): Promise<TextResponse> {
    const baseUrl = getOllamaBaseUrl();
    const model = getOllamaModel();

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          options: {
            temperature: options?.temperature ?? 0.8,
            num_predict: options?.maxTokens ?? 1000,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Ollama HTTP ${response.status}: ${body}`);
      }

      const data = (await response.json()) as OllamaChatResponse;
      const text = data.message?.content ?? data.response ?? '';
      const tokensUsed = (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0);

      return {
        text,
        model: data.model || model,
        tokensUsed,
      };
    } catch (err) {
      log.error({ err }, 'Ollama API call failed');
      throw err;
    }
  }
}

export const ollamaProvider = new OllamaProvider();
