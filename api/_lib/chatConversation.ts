/** Chat persistence helpers — keep types local to the API layer (no src/ imports). */

const EPHEMERAL_TYPES = new Set(['assistant-loading']);

export type ChatMessageRow = {
  id: string;
  type: string;
  content: Record<string, unknown>;
  created_at: string;
};

export type ChatConversationPayload = {
  conversationId: string | null;
  messages: Array<Record<string, unknown>>;
  lastWeekPlan: unknown;
  lastMealType: string | null;
};

export function isPersistableChatType(type: string): boolean {
  return !EPHEMERAL_TYPES.has(type);
}

export function persistableMessages(
  messages: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return messages.filter((m) => {
    const type = typeof m.type === 'string' ? m.type : '';
    return type && isPersistableChatType(type) && typeof m.id === 'string';
  });
}

export function messageToRow(
  message: Record<string, unknown>,
  conversationId: string,
  userId: string,
): ChatMessageRow & { conversation_id: string; user_id: string } {
  const id = String(message.id);
  const type = String(message.type);
  const timestamp =
    typeof message.timestamp === 'string' && message.timestamp
      ? message.timestamp
      : new Date().toISOString();

  const content: Record<string, unknown> = { ...message, timestamp };
  delete content.id;
  delete content.type;

  return {
    id,
    conversation_id: conversationId,
    user_id: userId,
    type,
    content,
    created_at:
      timestamp && !Number.isNaN(Date.parse(timestamp))
        ? timestamp
        : new Date().toISOString(),
  };
}

export function rowToMessage(row: {
  id: string;
  type: string;
  content: Record<string, unknown> | null;
  created_at?: string;
}): Record<string, unknown> {
  const content = row.content ?? {};
  const timestamp =
    (typeof content.timestamp === 'string' && content.timestamp) ||
    row.created_at ||
    new Date().toISOString();

  return {
    ...content,
    id: row.id,
    type: row.type,
    timestamp,
  };
}

export function normalizeMealType(value: unknown): string | null {
  if (
    value === 'desayuno' ||
    value === 'almuerzo' ||
    value === 'cena' ||
    value === 'snack'
  ) {
    return value;
  }
  return null;
}
