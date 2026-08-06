import {
  SchemaType,
  type Content,
  type GenerationConfig,
  type ResponseSchema,
} from '@google/generative-ai';
import { getGeminiClient } from '../gemini.js';
import { AiProviderError, classifyError } from '../observability/errors.js';
import type {
  AiMessage,
  JsonSchema,
  ProviderCapabilities,
  TextGenerationRequest,
  TextGenerationResponse,
  TextGenerator,
} from './types.js';

function schemaType(type: unknown): SchemaType | undefined {
  switch (type) {
    case 'object': return SchemaType.OBJECT;
    case 'array': return SchemaType.ARRAY;
    case 'string': return SchemaType.STRING;
    case 'number': return SchemaType.NUMBER;
    case 'integer': return SchemaType.INTEGER;
    case 'boolean': return SchemaType.BOOLEAN;
    default: return undefined;
  }
}

function toGeminiSchema(schema: JsonSchema): ResponseSchema {
  const converted: Record<string, unknown> = {};
  const type = schemaType(schema.type);
  if (type) converted.type = type;
  if (typeof schema.description === 'string') converted.description = schema.description;
  if (typeof schema.nullable === 'boolean') converted.nullable = schema.nullable;
  if (Array.isArray(schema.enum)) converted.enum = schema.enum;
  if (Array.isArray(schema.required)) converted.required = schema.required;
  if (schema.items && typeof schema.items === 'object') {
    converted.items = toGeminiSchema(schema.items as JsonSchema);
  }
  if (schema.properties && typeof schema.properties === 'object') {
    converted.properties = Object.fromEntries(
      Object.entries(schema.properties as Record<string, JsonSchema>)
        .map(([key, value]) => [key, toGeminiSchema(value)]),
    );
  }
  return converted as unknown as ResponseSchema;
}

function generationConfig(request: TextGenerationRequest): GenerationConfig {
  if (request.parameters?.seed != null) {
    throw new AiProviderError('Gemini adapter does not support seed', {
      category: 'provider',
      code: 'unsupported_seed',
      retryable: false,
    });
  }

  const config: GenerationConfig & {
    thinkingConfig?: { thinkingBudget?: number };
  } = {
    temperature: request.parameters?.temperature,
    maxOutputTokens: request.parameters?.maxOutputTokens,
    topP: request.parameters?.topP,
  };
  if (request.parameters?.thinkingBudget != null) {
    config.thinkingConfig = { thinkingBudget: request.parameters.thinkingBudget };
  }
  if (request.output?.type === 'json') {
    config.responseMimeType = 'application/json';
    config.responseSchema = toGeminiSchema(request.output.schema);
  }
  return config;
}

function toGeminiContents(messages: AiMessage[]): Content[] {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => {
      if (message.role === 'tool') {
        throw new AiProviderError('Gemini tool messages are not implemented', {
          category: 'provider',
          code: 'unsupported_tool_message',
          retryable: false,
        });
      }
      return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      };
    });
}

export class GeminiTextGenerator implements TextGenerator {
  readonly provider = 'gemini';
  readonly capabilities: ProviderCapabilities = {
    structuredOutput: true,
    tools: false,
    streaming: false,
    seed: false,
    tokenUsage: 'exact',
  };

  async generate(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    const systemInstruction = request.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const contents = toGeminiContents(request.messages);

    try {
      const model = getGeminiClient().getGenerativeModel({
        model: request.model,
        generationConfig: generationConfig(request),
        systemInstruction: systemInstruction || undefined,
      });
      const result = await model.generateContent({ contents });
      const usage = result.response.usageMetadata as
        | {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            totalTokenCount?: number;
            cachedContentTokenCount?: number;
            thoughtsTokenCount?: number;
          }
        | undefined;
      const inputTokens = usage?.promptTokenCount ?? 0;
      const outputTokens = usage?.candidatesTokenCount ?? 0;
      const reasoningTokens = usage?.thoughtsTokenCount;

      return {
        content: result.response.text(),
        provider: this.provider,
        model: request.model,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: usage?.totalTokenCount ?? inputTokens + outputTokens,
          cachedInputTokens: usage?.cachedContentTokenCount,
          reasoningTokens,
          estimated: usage == null,
        },
        finishReason: result.response.candidates?.[0]?.finishReason,
      };
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      const classified = classifyError(error);
      throw new AiProviderError(
        error instanceof Error ? error.message : 'Gemini generation failed',
        {
          category: classified.category === 'internal' ? 'provider' : classified.category,
          code: classified.code === 'internal_error' ? 'gemini_error' : classified.code,
          retryable: classified.retryable,
        },
        error,
      );
    }
  }
}
