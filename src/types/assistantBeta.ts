import type { WeekPlan } from './index';
import type { PropuestaGuardada } from '../domain/nutrikal/proposals.js';

export interface AssistantToolActivity {
  name: string;
  label: string;
  ok: boolean;
}

export interface AssistantBetaMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  proposals?: Array<{ id: string; title: string; plan: WeekPlan }>;
  drafts?: PropuestaGuardada[];
  tools?: AssistantToolActivity[];
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
