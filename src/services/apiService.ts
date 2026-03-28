import type { AppUser, GistPayload } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

interface AuthResponse {
  token: string;
  user: AppUser;
}

interface ApiError {
  error: string;
  field?: string;
}

export class ApiAuthError extends Error {
  field?: string;
  status: number;

  constructor(message: string, status: number, field?: string) {
    super(message);
    this.name = 'ApiAuthError';
    this.status = status;
    this.field = field;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const err = data as ApiError;
    throw new ApiAuthError(err.error || 'Error inesperado', res.status, err.field);
  }
  return data as T;
}

export async function register(
  username: string,
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, displayName }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function login(
  identifier: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function validateSession(token: string): Promise<AppUser> {
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleResponse<{ user: AppUser }>(res);
  return data.user;
}

// ── Data sync ──

interface LoadDataResponse {
  data: GistPayload | null;
  updatedAt: string | null;
}

export async function loadUserData(token: string): Promise<LoadDataResponse> {
  const res = await fetch(`${BASE_URL}/api/data/load`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<LoadDataResponse>(res);
}

export async function saveUserData(token: string, payload: GistPayload): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/data/save`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  await handleResponse<{ ok: boolean }>(res);
}
