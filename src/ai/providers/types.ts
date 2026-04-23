export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface StructuredContentResponse {
  text: string;
  hashtags: string[];
  model: string;
  tokensUsed: number;
}

export interface TextResponse {
  text: string;
  model: string;
  tokensUsed: number;
}

export interface LLMProvider {
  generateStructured(systemPrompt: string, userPrompt: string, options?: GenerateOptions): Promise<StructuredContentResponse>;
  generateText(systemPrompt: string, userPrompt: string, options?: GenerateOptions): Promise<TextResponse>;
}
