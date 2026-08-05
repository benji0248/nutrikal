import type { VercelRequest } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signToken } from './jwt.js';
import { AdminAuthError, requireObservabilityAdmin } from './adminAuth.js';

const payload = {
  sub: '00000000-0000-4000-8000-000000000001',
  username: 'admin',
  email: 'admin@nutrikal.test',
  displayName: 'Admin',
};

function requestWithToken(token: string): VercelRequest {
  return {
    headers: { authorization: `Bearer ${token}` },
  } as VercelRequest;
}

describe('observability admin authorization', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-with-enough-entropy';
    delete process.env.OBSERVABILITY_ADMIN_USER_IDS;
    delete process.env.OBSERVABILITY_ADMIN_EMAILS;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.OBSERVABILITY_ADMIN_USER_IDS;
    delete process.env.OBSERVABILITY_ADMIN_EMAILS;
  });

  it('denies every user when the allowlist is empty', () => {
    const token = signToken(payload);
    expect(() => requireObservabilityAdmin(requestWithToken(token)))
      .toThrowError(AdminAuthError);
  });

  it('accepts allowlisted emails case-insensitively', () => {
    process.env.OBSERVABILITY_ADMIN_EMAILS = 'other@example.com, ADMIN@NUTRIKAL.TEST';
    const token = signToken(payload);

    expect(requireObservabilityAdmin(requestWithToken(token))).toMatchObject(payload);
  });
});
