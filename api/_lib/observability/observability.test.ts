import { describe, expect, it } from 'vitest';
import { AiProviderError, SchemaValidationError, classifyError } from './errors.js';
import { calculateUsageCost, type ModelPrice } from './pricing.js';
import { formatDevelopmentSummary } from './repository.js';
import { DefaultGenerationTelemetry } from './telemetry.js';
import type {
  GenerationContext,
  GenerationRecord,
  GenerationRepository,
} from './types.js';

const context: GenerationContext = {
  generationId: '00000000-0000-4000-8000-000000000001',
  requestId: '00000000-0000-4000-8000-000000000002',
  userId: '00000000-0000-4000-8000-000000000003',
  operation: 'week_plan',
  provider: 'test-provider',
  requestStartedAtMs: Date.now(),
  recipe: {
    promptVersion: 'prompt-v1',
    model: 'test-model',
    businessRulesVersion: 'rules-v1',
    algorithmVersion: 'algorithm-v1',
    deploymentVersion: 'test',
  },
};

class MemoryRepository implements GenerationRepository {
  records: GenerationRecord[] = [];

  async save(record: GenerationRecord): Promise<void> {
    this.records.push(record);
  }
}

describe('error classification', () => {
  it('preserves normalized provider errors', () => {
    const error = new AiProviderError('quota exhausted', {
      category: 'rate_limit',
      code: 'provider_quota',
      retryable: true,
    });

    expect(classifyError(error)).toMatchObject({
      category: 'rate_limit',
      code: 'provider_quota',
      retryable: true,
    });
  });

  it('classifies schema failures separately from internal errors', () => {
    expect(classifyError(new SchemaValidationError('missing dishes'))).toMatchObject({
      category: 'schema_validation',
      retryable: true,
    });
  });
});

describe('cost calculation', () => {
  it('charges every successful retry and separates cached input', () => {
    const price: ModelPrice = {
      provider: 'test-provider',
      model: 'test-model',
      inputUsdPerMillion: '1.000000000',
      cachedInputUsdPerMillion: '0.100000000',
      outputUsdPerMillion: '2.000000000',
      requestUsd: '0.001000000',
    };
    const result = calculateUsageCost([
      {
        attempt: 1,
        provider: 'test-provider',
        model: 'test-model',
        durationMs: 10,
        success: true,
        usage: {
          inputTokens: 1_000,
          cachedInputTokens: 200,
          outputTokens: 500,
          totalTokens: 1_500,
          estimated: false,
        },
      },
      {
        attempt: 2,
        provider: 'test-provider',
        model: 'test-model',
        durationMs: 10,
        success: true,
        usage: {
          inputTokens: 1_000,
          cachedInputTokens: 200,
          outputTokens: 500,
          totalTokens: 1_500,
          estimated: false,
        },
      },
    ], price);

    expect(result.lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'input_tokens', quantity: 1_600 }),
      expect.objectContaining({ type: 'cached_input_tokens', quantity: 400 }),
      expect.objectContaining({ type: 'output_tokens', quantity: 1_000 }),
      expect.objectContaining({ type: 'request', quantity: 2 }),
    ]));
    expect(result.totalCostUsd).toBe('0.005640000');
  });
});

describe('generation telemetry', () => {
  it('persists one final record with stages, attempts, usage, and quality', async () => {
    const repository = new MemoryRepository();
    const tracker = new DefaultGenerationTelemetry(repository).start({
      ...context,
      recipe: { ...context.recipe },
    });

    const value = await tracker.stage('build_prompt', () => 'prompt');
    tracker.recordAttempt({
      provider: 'test-provider',
      model: 'test-model',
      durationMs: 20,
      success: true,
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        estimated: false,
      },
    });
    tracker.recordQuality([{
      name: 'json.valid',
      value: true,
      status: 'pass',
      evaluator: 'test',
      evaluatorVersion: 'v1',
      source: 'server',
    }]);
    await tracker.complete();

    expect(value).toBe('prompt');
    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      status: 'completed',
      usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      stages: [{ name: 'build_prompt', success: true }],
      quality: [{ name: 'json.valid', value: true }],
    });
  });
});

describe('development console summary', () => {
  it('renders a readable request timeline without sensitive user data', () => {
    const record: GenerationRecord = {
      schemaVersion: 1,
      context,
      status: 'completed',
      startedAt: new Date(context.requestStartedAtMs).toISOString(),
      completedAt: new Date(context.requestStartedAtMs + 100).toISOString(),
      totalDurationMs: 100,
      stages: [{ name: 'read_profile', durationMs: 41, success: true }],
      attempts: [],
      quality: [],
      payloads: [],
      usage: {
        inputTokens: 6_123,
        outputTokens: 1_328,
        totalTokens: 7_451,
        estimated: false,
      },
      usageLines: [],
      totalCostUsd: '0.003700000',
    };

    const output = formatDevelopmentSummary(record);
    expect(output).toContain('Load User');
    expect(output).toContain('41 ms');
    expect(output).toContain('Input Tokens');
    expect(output).toContain('$0.003700');
    expect(output).not.toContain(context.userId);
  });
});
