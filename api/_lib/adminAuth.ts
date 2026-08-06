import type { VercelRequest } from '@vercel/node';
import { verifyToken } from './jwt.js';

type JwtPayload = ReturnType<typeof verifyToken>;

export class AdminAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

function allowlist(name: string): Set<string> {
  return new Set(
    (process.env[name] ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function requireObservabilityAdmin(req: VercelRequest): JwtPayload {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AdminAuthError('Missing authorization', 401);
  }

  let payload: JwtPayload;
  try {
    payload = verifyToken(authHeader.slice(7));
  } catch {
    throw new AdminAuthError('Invalid token', 401);
  }

  const ids = allowlist('OBSERVABILITY_ADMIN_USER_IDS');
  const emails = allowlist('OBSERVABILITY_ADMIN_EMAILS');
  if (!ids.has(payload.sub.toLowerCase()) && !emails.has(payload.email.toLowerCase())) {
    throw new AdminAuthError('Observability admin access required', 403);
  }
  return payload;
}
