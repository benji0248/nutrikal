export type AiRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AiMessage {
  role: AiRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

export type JsonSchema = Record<string, unknown>;

export type OutputContract =
  | { type: 'text' }
  | { type: 'json'; schema: JsonSchema; strict?: boolean };

export interface GenerationParameters {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  seed?: number;
  /** Gemini 2.5+: 0 disables thinking for lower latency. */
  thinkingBudget?: number;
}

export interface TextGenerationRequest {
  model: string;
  messages: AiMessage[];
  output?: OutputContract;
  parameters?: GenerationParameters;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  estimated: boolean;
}

export interface TextGenerationResponse {
  content: string;
  provider: string;
  model: string;
  usage: TokenUsage;
  finishReason?: string;
  providerRequestId?: string;
}

export interface ProviderCapabilities {
  structuredOutput: boolean;
  tools: boolean;
  streaming: boolean;
  seed: boolean;
  tokenUsage: 'exact' | 'estimated' | 'unavailable';
}

export interface TextGenerator {
  readonly provider: string;
  readonly capabilities: ProviderCapabilities;
  generate(request: TextGenerationRequest): Promise<TextGenerationResponse>;
}

export interface EmbeddingRequest {
  model: string;
  inputs: string[];
  dimensions?: number;
}

export interface EmbeddingResponse {
  provider: string;
  model: string;
  vectors: number[][];
  usage?: Pick<TokenUsage, 'inputTokens' | 'totalTokens' | 'estimated'>;
}

export interface EmbeddingGenerator {
  readonly provider: string;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
