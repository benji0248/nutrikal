import { getGeminiClient } from '../gemini.js';
import { AiProviderError, classifyError } from '../observability/errors.js';
import type {
  EmbeddingGenerator,
  EmbeddingRequest,
  EmbeddingResponse,
} from './types.js';

export class GeminiEmbeddingGenerator implements EmbeddingGenerator {
  readonly provider = 'gemini';

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (request.dimensions != null && request.dimensions !== 768) {
      throw new AiProviderError('Gemini text-embedding-004 only supports 768 dimensions', {
        category: 'provider',
        code: 'unsupported_embedding_dimensions',
        retryable: false,
      });
    }

    try {
      const model = getGeminiClient().getGenerativeModel({ model: request.model });
      const results = await Promise.all(
        request.inputs.map((input) => model.embedContent(input)),
      );
      return {
        provider: this.provider,
        model: request.model,
        vectors: results.map((result) => result.embedding.values),
      };
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      const classified = classifyError(error);
      throw new AiProviderError(
        error instanceof Error ? error.message : 'Gemini embedding failed',
        {
          category: classified.category === 'internal' ? 'provider' : classified.category,
          code: classified.code === 'internal_error' ? 'gemini_embedding_error' : classified.code,
          retryable: classified.retryable,
        },
        error,
      );
    }
  }
}
