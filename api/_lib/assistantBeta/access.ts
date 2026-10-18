// Enrollment is server-owned. The browser never supplies an allowed user ID.
const PILOT_USER_ID = 'df991818-9d59-4c71-84e3-f8fafcb2451f';

export function assistantBetaEnabled(userId: string): boolean {
  return process.env.ASSISTANT_BETA_DISABLED !== 'true' && userId === PILOT_USER_ID;
}
