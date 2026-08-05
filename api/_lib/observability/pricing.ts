import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProviderAttempt, UsageLine } from './types.js';

export interface ModelPrice {
  provider: string;
  model: string;
  inputUsdPerMillion: string;
  outputUsdPerMillion: string;
  cachedInputUsdPerMillion?: string;
  reasoningUsdPerMillion?: string;
  requestUsd?: string;
}

export interface PricingCatalog {
  find(provider: string, model: string, occurredAt: Date): Promise<ModelPrice | null>;
}

export class SupabasePricingCatalog implements PricingCatalog {
  constructor(private readonly supabase: SupabaseClient) {}

  async find(provider: string, model: string, occurredAt: Date): Promise<ModelPrice | null> {
    const timestamp = occurredAt.toISOString();
    const { data, error } = await this.supabase
      .from('ai_model_prices')
      .select(
        'provider, model, input_usd_per_million, output_usd_per_million, cached_input_usd_per_million, reasoning_usd_per_million, request_usd',
      )
      .eq('provider', provider)
      .eq('model', model)
      .lte('valid_from', timestamp)
      .or(`valid_until.is.null,valid_until.gt.${timestamp}`)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Pricing lookup failed: ${error.message}`);
    if (!data) return null;

    return {
      provider: String(data.provider),
      model: String(data.model),
      inputUsdPerMillion: String(data.input_usd_per_million),
      outputUsdPerMillion: String(data.output_usd_per_million),
      cachedInputUsdPerMillion: data.cached_input_usd_per_million == null
        ? undefined
        : String(data.cached_input_usd_per_million),
      reasoningUsdPerMillion: data.reasoning_usd_per_million == null
        ? undefined
        : String(data.reasoning_usd_per_million),
      requestUsd: data.request_usd == null ? undefined : String(data.request_usd),
    };
  }
}

function tokenLine(
  type: UsageLine['type'],
  quantity: number,
  unitPrice: string | undefined,
  estimated: boolean,
): UsageLine | undefined {
  if (quantity <= 0) return undefined;
  const cost = unitPrice == null
    ? undefined
    : ((quantity / 1_000_000) * Number(unitPrice)).toFixed(9);
  return {
    type,
    quantity,
    unit: 'token',
    unitPriceUsd: unitPrice,
    costUsd: cost,
    estimated,
  };
}

export function calculateUsageCost(
  attempts: ProviderAttempt[],
  price: ModelPrice | null,
): { lines: UsageLine[]; totalCostUsd?: string } {
  const usage = attempts.flatMap((attempt) => attempt.usage ? [attempt.usage] : []);
  const input = usage.reduce((sum, item) => sum + item.inputTokens, 0);
  const output = usage.reduce((sum, item) => sum + item.outputTokens, 0);
  const cached = usage.reduce((sum, item) => sum + (item.cachedInputTokens ?? 0), 0);
  const reasoning = usage.reduce((sum, item) => sum + (item.reasoningTokens ?? 0), 0);
  const estimated = usage.some((item) => item.estimated);
  const uncachedInput = Math.max(0, input - cached);

  const lines = [
    tokenLine('input_tokens', uncachedInput, price?.inputUsdPerMillion, estimated),
    tokenLine('cached_input_tokens', cached, price?.cachedInputUsdPerMillion, estimated),
    tokenLine('output_tokens', output, price?.outputUsdPerMillion, estimated),
    tokenLine('reasoning_tokens', reasoning, price?.reasoningUsdPerMillion, estimated),
  ].filter((line): line is UsageLine => line != null);

  if (price?.requestUsd && attempts.length > 0) {
    lines.push({
      type: 'request',
      quantity: attempts.length,
      unit: 'request',
      unitPriceUsd: price.requestUsd,
      costUsd: (attempts.length * Number(price.requestUsd)).toFixed(9),
      estimated: false,
    });
  }

  if (!price || lines.some((line) => line.costUsd == null)) {
    return { lines };
  }
  const total = lines.reduce((sum, line) => sum + Number(line.costUsd), 0);
  return { lines, totalCostUsd: total.toFixed(9) };
}
