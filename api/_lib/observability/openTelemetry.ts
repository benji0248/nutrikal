import {
  SpanStatusCode,
  context as otelContext,
  trace,
  type Attributes,
  type Span,
  type Tracer,
} from '@opentelemetry/api';
import type {
  GenerationContext,
  GenerationStage,
  GenerationTrace,
  GenerationTraceFactory,
  Primitive,
} from './types.js';
import type { ClassifiedError } from './errors.js';

function attributes(values?: Record<string, Primitive>): Attributes {
  if (!values) return {};
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string | number | boolean] =>
      entry[1] !== null,
    ),
  );
}

export class OpenTelemetryTraceFactory implements GenerationTraceFactory {
  private readonly tracer: Tracer;

  constructor(name = 'nutrikal.ai', version = '1.0.0') {
    this.tracer = trace.getTracer(name, version);
  }

  start(generation: GenerationContext): GenerationTrace {
    const span = this.tracer.startSpan(`ai.${generation.operation}`, {
      attributes: {
        'ai.generation.id': generation.generationId,
        'ai.request.id': generation.requestId,
        'ai.operation': generation.operation,
        'gen_ai.system': generation.provider,
        'gen_ai.request.model': generation.recipe.model,
        'ai.prompt.version': generation.recipe.promptVersion,
        'ai.rules.version': generation.recipe.businessRulesVersion,
        'ai.algorithm.version': generation.recipe.algorithmVersion,
        'service.version': generation.recipe.deploymentVersion,
      },
    });
    return new OpenTelemetryGenerationTrace(this.tracer, span);
  }
}

class OpenTelemetryGenerationTrace implements GenerationTrace {
  constructor(
    private readonly tracer: Tracer,
    private readonly root: Span,
  ) {}

  runStage<T>(
    name: GenerationStage,
    stageAttributes: Record<string, Primitive> | undefined,
    operation: () => Promise<T> | T,
  ): Promise<T> {
    const parentContext = trace.setSpan(otelContext.active(), this.root);
    return otelContext.with(parentContext, () =>
      this.tracer.startActiveSpan(`ai.stage.${name}`, {
        attributes: {
          'ai.stage': name,
          ...attributes(stageAttributes),
        },
      }, async (span) => {
        try {
          const result = await operation();
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          const exception = error instanceof Error ? error : new Error(String(error));
          span.recordException(exception);
          span.setStatus({ code: SpanStatusCode.ERROR, message: exception.message });
          throw error;
        } finally {
          span.end();
        }
      }),
    );
  }

  finish(status: 'completed' | 'failed', error?: ClassifiedError): void {
    this.root.setAttribute('ai.generation.status', status);
    if (error) {
      this.root.setAttribute('error.type', error.category);
      this.root.setAttribute('error.code', error.code);
      this.root.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    } else {
      this.root.setStatus({ code: SpanStatusCode.OK });
    }
    this.root.end();
  }
}
