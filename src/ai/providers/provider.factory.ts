import { env } from '../../config';
import { openaiProvider } from './openai.provider';
import { ollamaProvider } from './ollama.provider';
import type { LLMProvider } from './types';

export type AIProviderName = 'openai' | 'ollama';

export function getLLMProvider(preferred?: AIProviderName): LLMProvider {
  const selected = preferred || (env.AI_PROVIDER as AIProviderName) || 'openai';
  if (selected === 'ollama') return ollamaProvider;
  return openaiProvider;
}
