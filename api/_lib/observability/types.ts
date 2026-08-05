import type { TokenUsage } from '../ai/types.js';
import type { ClassifiedError } from './errors.js';

export type GenerationStage =
  | 'rate_limit'
  | 'read_profile'
  | 'read_history'
  | 'read_embeddings'
  | 'build_context'
  | 'build_prompt'
  | 'provider_call'
  | 'parse_response'
  | 'schema_validation'
  | 'nutrition_validation'
  | 'hydrate_dishes'
  | 'persist_plan'
  | 'record_usage';

export type Primitive = string | number | boolean | null;

export interface GenerationRecipe {
  promptVersion: string;
  promptHash?: string;
  model: string;
  modelParametersHash?: string;
  businessRulesVersion: string;
  algorithmVersion: string;
  ingredientDatasetVersion?: string;
  memoryStrategyVersion?: string;
  embeddingModelVersion?: string;
  embeddingIndexVersion?: string;
  deploymentVersion: string;
}

export interface GenerationContext {
  generationId: string;
  requestId: string;
  userId: string;
  operation: 'week_plan' | 'dish' | 'embedding';
  provider: string;
  requestStartedAtMs: number;
  recipe: GenerationRecipe;
}

export interface StageRecord {
  name: GenerationStage;
  durationMs: number;
  success: boolean;
  attributes?: Record<string, Primitive>;
  error?: ClassifiedError;
}

export interface ProviderAttempt {
  attempt: number;
  provider: string;
  model: string;
  durationMs: number;
  success: boolean;
  usage?: TokenUsage;
  finishReason?: string;
  error?: ClassifiedError;
}

export interface QualityMetric {
  name: string;
  value: boolean | number | string;
  status?: 'pass' | 'fail' | 'unknown';
  expected?: number | string;
  actual?: number | string;
  unit?: string;
  evaluator: string;
  evaluatorVersion: string;
  source: 'server' | 'client' | 'human' | 'llm_judge';
  thresholdVersion?: string;
  details?: Record<string, unknown>;
}

export type PayloadType =
  | 'system_prompt'
  | 'user_prompt'
  | 'context'
  | 'raw_response'
  | 'parsed_response'
  | 'parse_error';

export interface CapturedPayload {
  type: PayloadType;
  hash: string;
  sizeBytes: number;
  encryptedContent?: string;
  redactionVersion: string;
  expiresAt?: string;
}

export interface UsageLine {
  type:
    | 'input_tokens'
    | 'cached_input_tokens'
    | 'output_tokens'
    | 'reasoning_tokens'
    | 'embedding_tokens'
    | 'request';
  quantity: number;
  unit: 'token' | 'request';
  unitPriceUsd?: string;
  costUsd?: string;
  estimated: boolean;
}

export interface GenerationRecord {
  schemaVersion: 1;
  context: GenerationContext;
  status: 'completed' | 'failed';
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  stages: StageRecord[];
  attempts: ProviderAttempt[];
  quality: QualityMetric[];
  payloads: CapturedPayload[];
  usage: TokenUsage;
  usageLines: UsageLine[];
  totalCostUsd?: string;
  error?: ClassifiedError;
}

export interface GenerationRepository {
  save(record: GenerationRecord): Promise<void>;
}

export interface GenerationTrace {
  runStage<T>(
    name: GenerationStage,
    attributes: Record<string, Primitive> | undefined,
    operation: () => Promise<T> | T,
  ): Promise<T>;
  finish(status: 'completed' | 'failed', error?: ClassifiedError): void;
}

export interface GenerationTraceFactory {
  start(context: GenerationContext): GenerationTrace;
}

export interface GenerationTracker {
  stage<T>(
    name: GenerationStage,
    operation: () => Promise<T> | T,
    attributes?: Record<string, Primitive>,
  ): Promise<T>;
  recordAttempt(attempt: Omit<ProviderAttempt, 'attempt'>): void;
  recordQuality(metrics: QualityMetric[]): void;
  recordPayload(type: PayloadType, value: unknown): void;
  updateRecipe(recipe: Partial<GenerationRecipe>): void;
  complete(): Promise<void>;
  fail(error: unknown): Promise<void>;
}

export interface GenerationTelemetry {
  start(context: GenerationContext): GenerationTracker;
}
