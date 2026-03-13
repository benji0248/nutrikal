import { Octokit } from '@octokit/rest';
import type { GistPayload, GistUser } from '../types';

const GIST_FILENAME = 'nutrikal-data.json';
const GIST_DESCRIPTION = 'NutriKal — nutrition calendar data';

const octokitCache = new Map<string, Octokit>();

function getOctokit(token: string): Octokit {
  let instance = octokitCache.get(token);
  if (!instance) {
    instance = new Octokit({ auth: token });
    octokitCache.set(token, instance);
  }
  return instance;
}

export class GistAuthError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'GistAuthError';
  }
}

export class GistParseError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'GistParseError';
  }
}

export class GistSaveError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'GistSaveError';
  }
}

function emptyPayload(): GistPayload {
  return {
    version: 1,
    lastModified: new Date().toISOString(),
    dayPlans: {},
    weekTemplates: [],
    savedRecipes: [],
    customIngredients: [],
    notifications: [],
    settings: {
      waterGoalDefault: 8,
      theme: 'dark',
    },
    profile: undefined,
    shoppingLists: [],
    activityLog: [],
  };
}

export async function validateToken(token: string): Promise<GistUser> {
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.users.getAuthenticated();
    return {
      login: data.login,
      name: data.name ?? '',
      avatarUrl: data.avatar_url,
      token,
      gistId: null,
    };
  } catch (err: unknown) {
    octokitCache.delete(token);
    const status = (err as { status?: number }).status;
    if (status === 401) {
      throw new GistAuthError('Token inválido o sin permisos de Gist');
    }
    throw err;
  }
}

export async function findOrCreateGist(token: string): Promise<string> {
  const octokit = getOctokit(token);

  // Search through user's gists
  const { data: gists } = await octokit.gists.list({ per_page: 100 });
  const existing = gists.find((g) => g.description === GIST_DESCRIPTION);
  if (existing) return existing.id;

  // Create new private gist
  const { data: newGist } = await octokit.gists.create({
    description: GIST_DESCRIPTION,
    public: false,
    files: {
      [GIST_FILENAME]: { content: JSON.stringify(emptyPayload(), null, 2) },
    },
  });
  return newGist.id!;
}

export async function loadGist(token: string, gistId: string): Promise<GistPayload> {
  const octokit = getOctokit(token);
  try {
    const { data } = await octokit.gists.get({ gist_id: gistId });
    const file = data.files?.[GIST_FILENAME];
    if (!file?.content) {
      throw new GistParseError('Archivo de datos no encontrado en el Gist');
    }
    const parsed = JSON.parse(file.content);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new GistParseError('Formato de datos inválido');
    }
    return migratePayload(parsed);
  } catch (err) {
    if (err instanceof GistParseError) throw err;
    if (err instanceof SyntaxError) {
      throw new GistParseError('JSON inválido en el Gist');
    }
    throw err;
  }
}

export async function saveGist(
  token: string,
  gistId: string,
  payload: GistPayload,
): Promise<void> {
  const octokit = getOctokit(token);
  const toSave = { ...payload, lastModified: new Date().toISOString() };

  const attemptSave = async () => {
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(toSave, null, 2) },
      },
    });
  };

  try {
    await attemptSave();
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    // Retry once on conflict
    if (status === 409) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        await attemptSave();
      } catch {
        throw new GistSaveError('Error al guardar: conflicto persistente');
      }
      return;
    }
    throw new GistSaveError(
      `Error al guardar en Gist: ${(err as Error).message ?? 'desconocido'}`,
    );
  }
}

export function migratePayload(data: unknown): GistPayload {
  const base = emptyPayload();
  if (typeof data !== 'object' || data === null) return base;

  const raw = data as Record<string, unknown>;

  return {
    ...raw,
    version: typeof raw.version === 'number' ? raw.version : 1,
    lastModified:
      typeof raw.lastModified === 'string' ? raw.lastModified : base.lastModified,
    dayPlans:
      raw.dayPlans && typeof raw.dayPlans === 'object'
        ? (raw.dayPlans as GistPayload['dayPlans'])
        : base.dayPlans,
    weekTemplates: Array.isArray(raw.weekTemplates)
      ? (raw.weekTemplates as GistPayload['weekTemplates'])
      : base.weekTemplates,
    savedRecipes: Array.isArray(raw.savedRecipes)
      ? (raw.savedRecipes as GistPayload['savedRecipes'])
      : base.savedRecipes,
    customIngredients: Array.isArray(raw.customIngredients)
      ? (raw.customIngredients as GistPayload['customIngredients'])
      : base.customIngredients,
    notifications: Array.isArray(raw.notifications)
      ? (raw.notifications as GistPayload['notifications'])
      : base.notifications,
    settings: {
      waterGoalDefault:
        raw.settings &&
        typeof (raw.settings as Record<string, unknown>).waterGoalDefault === 'number'
          ? (raw.settings as GistPayload['settings']).waterGoalDefault
          : base.settings.waterGoalDefault,
      theme:
        raw.settings &&
        ((raw.settings as Record<string, unknown>).theme === 'dark' ||
          (raw.settings as Record<string, unknown>).theme === 'light')
          ? (raw.settings as GistPayload['settings']).theme
          : base.settings.theme,
    },
    profile:
      raw.profile && typeof raw.profile === 'object'
        ? (raw.profile as GistPayload['profile'])
        : base.profile,
    shoppingLists: Array.isArray(raw.shoppingLists)
      ? (raw.shoppingLists as GistPayload['shoppingLists'])
      : base.shoppingLists,
    activityLog: Array.isArray(raw.activityLog)
      ? (raw.activityLog as GistPayload['activityLog'])
      : base.activityLog,
  } as GistPayload;
}
