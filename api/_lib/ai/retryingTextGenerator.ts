import { performance } from 'node:perf_hooks';
import { classifyError } from '../observability/errors.js';
import type { GenerationTracker } from '../observability/types.js';
import type {
  ProviderCapabilities,
  TextGenerationRequest,
  TextGenerationResponse,
  TextGenerator,
} from './types.js';

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 900,
  maxDelayMs: 10_000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryingTextGenerator implements TextGenerator {
  readonly provider: string;
  readonly capabilities: ProviderCapabilities;

  constructor(
    private readonly delegate: TextGenerator,
    private readonly tracker: GenerationTracker,
    private readonly policy: RetryPolicy = DEFAULT_POLICY,
  ) {
    this.provider = delegate.provider;
    this.capabilities = delegate.capabilities;
  }

  async generate(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.policy.maxAttempts; attempt++) {
      const started = performance.now();
      try {
        const response = await this.delegate.generate(request);
        this.tracker.recordAttempt({
          provider: response.provider,
          model: response.model,
          durationMs: Math.round((performance.now() - started) * 100) / 100,
          success: true,
          usage: response.usage,
          finishReason: response.finishReason,
        });
        return response;
      } catch (error) {
        lastError = error;
        const classified = classifyError(error);
        this.tracker.recordAttempt({
          provider: this.delegate.provider,
          model: request.model,
          durationMs: Math.round((performance.now() - started) * 100) / 100,
          success: false,
          error: classified,
        });
        if (!classified.retryable || attempt === this.policy.maxAttempts) throw error;

        const exponential = this.policy.baseDelayMs * 2 ** (attempt - 1);
        const delayMs = Math.min(this.policy.maxDelayMs, exponential) + Math.random() * 400;
        await sleep(delayMs);
      }
    }

    throw lastError;
  }
}
