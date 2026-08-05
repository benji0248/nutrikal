export type ErrorCategory =
  | 'timeout'
  | 'rate_limit'
  | 'invalid_json'
  | 'schema_validation'
  | 'provider'
  | 'database'
  | 'network'
  | 'internal';

export interface ClassifiedError {
  category: ErrorCategory;
  code: string;
  message: string;
  retryable: boolean;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly details: Omit<ClassifiedError, 'message'>,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AiProviderError';
  }
}

export class InvalidJsonError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InvalidJsonError';
  }
}

export class SchemaValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SchemaValidationError';
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof AiProviderError) {
    return { ...error.details, message: error.message };
  }
  if (error instanceof InvalidJsonError || error instanceof SyntaxError) {
    return {
      category: 'invalid_json',
      code: 'invalid_json',
      message: error.message,
      retryable: true,
    };
  }
  if (error instanceof SchemaValidationError) {
    return {
      category: 'schema_validation',
      code: 'schema_validation',
      message: error.message,
      retryable: true,
    };
  }

  const message = errorMessage(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('timeout')
    || normalized.includes('timed out')
    || normalized.includes('deadline exceeded')
    || normalized.includes('aborterror')
  ) {
    return { category: 'timeout', code: 'timeout', message, retryable: true };
  }
  if (
    normalized.includes('429')
    || normalized.includes('rate limit')
    || normalized.includes('resource exhausted')
    || normalized.includes('too many requests')
  ) {
    return { category: 'rate_limit', code: 'rate_limit', message, retryable: true };
  }
  if (
    normalized.includes('econnreset')
    || normalized.includes('enotfound')
    || normalized.includes('fetch failed')
    || normalized.includes('network')
  ) {
    return { category: 'network', code: 'network_error', message, retryable: true };
  }
  if (
    normalized.includes('supabase')
    || normalized.includes('postgres')
    || normalized.includes('database')
  ) {
    return { category: 'database', code: 'database_error', message, retryable: false };
  }
  if (
    normalized.includes('503')
    || normalized.includes('service unavailable')
    || normalized.includes('overloaded')
    || normalized.includes('high demand')
  ) {
    return { category: 'provider', code: 'provider_unavailable', message, retryable: true };
  }

  return { category: 'internal', code: 'internal_error', message, retryable: false };
}
