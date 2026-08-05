import { getSupabase } from '../supabase.js';
import { SupabasePricingCatalog } from './pricing.js';
import { OpenTelemetryTraceFactory } from './openTelemetry.js';
import {
  BestEffortGenerationRepository,
  ConsoleGenerationRepository,
  SupabaseGenerationRepository,
} from './repository.js';
import { DefaultGenerationTelemetry } from './telemetry.js';
import type { GenerationTelemetry } from './types.js';

let telemetry: GenerationTelemetry | undefined;

export function getGenerationTelemetry(): GenerationTelemetry {
  if (telemetry) return telemetry;

  const consoleRepository = new ConsoleGenerationRepository();
  const traces = new OpenTelemetryTraceFactory();
  const persistenceEnabled = process.env.AI_OBSERVABILITY_PERSISTENCE === 'true';
  if (!persistenceEnabled) {
    telemetry = new DefaultGenerationTelemetry(consoleRepository, undefined, traces);
    return telemetry;
  }

  const supabase = getSupabase();
  telemetry = new DefaultGenerationTelemetry(
    new BestEffortGenerationRepository(
      new SupabaseGenerationRepository(supabase),
      consoleRepository,
    ),
    new SupabasePricingCatalog(supabase),
    traces,
  );
  return telemetry;
}
