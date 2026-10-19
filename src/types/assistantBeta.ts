import type { WeekPlan } from './index';
import type { PropuestaGuardada } from '../domain/nutrikal/proposals.js';

export interface AssistantToolActivity {
  name: string;
  label: string;
  ok: boolean;
  code?: string;
  durationMs?: number;
  calendarQuery?: { desde: string; hasta: string; total?: number; returned?: number; hasMore?: boolean };
}

export interface AssistantTurnDiagnostics {
  model: string;
  outcome: 'answered' | 'draft_saved' | 'empty_response' | 'provider_error' | 'blocked_response' | 'tool_limit' | 'time_limit';
  recoveries: number;
  rounds: Array<{
    durationMs: number;
    finishReason?: string;
    blockReason?: string;
    errorType?: string;
    calls: string[];
    inputTokens?: number;
    outputTokens?: number;
  }>;
}

export interface AssistantBetaMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  proposals?: Array<{ id: string; title: string; plan: WeekPlan }>;
  drafts?: PropuestaGuardada[];
  draftReference?: { id: string; title: string };
  tools?: AssistantToolActivity[];
  diagnostics?: AssistantTurnDiagnostics;
}

export interface AssistantBetaConversation {
  id: string;
  title: string;
  revision: number;
  messages: AssistantBetaMessage[];
}

export interface AssistantBetaState {
  enabled: boolean;
  conversation: AssistantBetaConversation | null;
  conversations: Array<{ id: string; title: string; updatedAt: string }>;
}
