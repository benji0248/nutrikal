import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getSupabase } from '../_lib/supabase.js';
import { parseMultipartUpload } from '../_lib/multipart.js';
import { mapStudyDetail, mapStudySummary } from '../_lib/medicalStudyMapper.js';
import {
  createSignedFileUrl,
  getStudyRow,
  runExplainStage,
  runExtractStage,
  runStructureStage,
} from '../_lib/medicalStudyPipeline.js';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
  MEDICAL_STUDIES_BUCKET,
  type MedicalStudyRow,
} from '../_lib/medicalStudyTypes.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface AuthContext {
  userId: string;
}

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return Buffer.from(JSON.stringify(req.body));
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body);
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function withAuth(
  req: VercelRequest,
  res: VercelResponse,
  handler: (auth: AuthContext, segments: string[]) => Promise<VercelResponse | void>,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    return handler({ userId: payload.sub }, getSegments(req));
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function getSegments(req: VercelRequest): string[] {
  const route = req.query.route;
  if (typeof route === 'string') return route.split('/').filter(Boolean);
  if (Array.isArray(route)) return route.flatMap((r) => String(r).split('/')).filter(Boolean);
  return [];
}

async function countParameters(studyIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!studyIds.length) return map;

  const supabase = getSupabase();
  const { data } = await supabase
    .from('medical_study_parameters')
    .select('study_id')
    .in('study_id', studyIds);

  for (const row of data ?? []) {
    const id = row.study_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

async function loadStudyDetail(userId: string, studyId: string) {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from('medical_studies')
    .select('*')
    .eq('id', studyId)
    .eq('user_id', userId)
    .single();

  if (error || !row) return null;

  const { data: params } = await supabase
    .from('medical_study_parameters')
    .select('*')
    .eq('study_id', studyId)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  return mapStudyDetail(row as MedicalStudyRow, params ?? []);
}

type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
  auth: AuthContext,
  segments: string[],
) => Promise<VercelResponse | void>;

const handlers: Record<string, RouteHandler> = {
  'GET medical-studies': async (_req, res, auth) => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('medical_studies')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Error al listar estudios' });

    const rows = (data ?? []) as MedicalStudyRow[];
    const counts = await countParameters(rows.map((r) => r.id));
    return res.status(200).json({
      studies: rows.map((row) => mapStudySummary(row, counts.get(row.id) ?? 0)),
    });
  },

  'GET medical-studies/parameters/timeline': async (req, res, auth) => {
    const parameterKey = String(req.query.parameterKey ?? '').trim();
    if (!parameterKey) {
      return res.status(400).json({ error: 'parameterKey requerido' });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('medical_study_parameters')
      .select(`
        id, parameter_key, value_numeric, value_text, unit, reference_range, flag,
        medical_studies!inner(id, study_date, study_type, laboratory, created_at)
      `)
      .eq('user_id', auth.userId)
      .eq('parameter_key', parameterKey)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: 'Error al cargar evolución' });

    const points = (data ?? []).map((row) => {
      const rawStudy = row.medical_studies;
      const studyRow = (Array.isArray(rawStudy) ? rawStudy[0] : rawStudy) as {
        id: string;
        study_date: string | null;
        study_type: string | null;
        laboratory: string | null;
        created_at: string;
      } | null;
      if (!studyRow) {
        return null;
      }
      return {
        studyId: studyRow.id,
        studyDate: studyRow.study_date ?? undefined,
        studyType: studyRow.study_type ?? undefined,
        laboratory: studyRow.laboratory ?? undefined,
        valueNumeric: row.value_numeric != null ? Number(row.value_numeric) : undefined,
        valueText: row.value_text ?? undefined,
        unit: row.unit ?? undefined,
        referenceRange: row.reference_range ?? undefined,
        flag: row.flag ?? undefined,
        recordedAt: studyRow.study_date ?? studyRow.created_at,
      };
    }).filter((point): point is NonNullable<typeof point> => point !== null);

    return res.status(200).json({ parameterKey, points });
  },

  'GET medical-studies/:id': async (_req, res, auth, segments) => {
    const studyId = segments[1];
    const detail = await loadStudyDetail(auth.userId, studyId);
    if (!detail) return res.status(404).json({ error: 'Estudio no encontrado' });
    return res.status(200).json({ study: detail });
  },

  'GET medical-studies/:id/file-url': async (_req, res, auth, segments) => {
    const studyId = segments[1];
    const row = await getStudyRow(auth.userId, studyId);
    const url = await createSignedFileUrl(row.storage_path);
    return res.status(200).json({ url, mimeType: row.mime_type, filename: row.original_filename });
  },

  'POST medical-studies/upload': async (req, res, auth) => {
    const rawBody = await readRawBody(req);
    const upload = await parseMultipartUpload(rawBody, req.headers);

    const mimeType = upload.mimeType === 'image/jpg' ? 'image/jpeg' : upload.mimeType;
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return res.status(400).json({ error: 'Formato no soportado. Usá PDF, JPG, PNG o WebP.' });
    }
    if (upload.buffer.length > MAX_FILE_BYTES) {
      return res.status(400).json({ error: 'El archivo supera el límite de 50 MB.' });
    }

    const studyId = randomUUID();
    const ext = upload.filename.includes('.') ? upload.filename.split('.').pop() : 'bin';
    const storagePath = `${auth.userId}/${studyId}.${ext}`;

    const supabase = getSupabase();
    const { error: uploadError } = await supabase.storage
      .from(MEDICAL_STUDIES_BUCKET)
      .upload(storagePath, upload.buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      return res.status(500).json({ error: 'Error al guardar archivo', detail: uploadError.message });
    }

    const { data, error } = await supabase
      .from('medical_studies')
      .insert({
        id: studyId,
        user_id: auth.userId,
        original_filename: upload.filename,
        mime_type: mimeType,
        file_size_bytes: upload.buffer.length,
        storage_path: storagePath,
        status: 'uploaded',
      })
      .select('*')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: 'Error al registrar estudio' });
    }

    return res.status(201).json({ study: mapStudySummary(data as MedicalStudyRow, 0) });
  },

  'POST medical-studies/:id/extract': async (_req, res, auth, segments) => {
    const studyId = segments[1];
    try {
      await runExtractStage(auth.userId, studyId);
      const detail = await loadStudyDetail(auth.userId, studyId);
      return res.status(200).json({ study: detail });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error en extracción';
      return res.status(500).json({ error: message });
    }
  },

  'POST medical-studies/:id/structure': async (_req, res, auth, segments) => {
    const studyId = segments[1];
    try {
      await runStructureStage(auth.userId, studyId);
      const detail = await loadStudyDetail(auth.userId, studyId);
      return res.status(200).json({ study: detail });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al estructurar';
      return res.status(500).json({ error: message });
    }
  },

  'POST medical-studies/:id/explain': async (_req, res, auth, segments) => {
    const studyId = segments[1];
    try {
      await runExplainStage(auth.userId, studyId);
      const detail = await loadStudyDetail(auth.userId, studyId);
      return res.status(200).json({ study: detail });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al explicar';
      return res.status(500).json({ error: message });
    }
  },

  'POST medical-studies/:id/reprocess': async (req, res, auth, segments) => {
    const studyId = segments[1];
    const body = await readJsonBody(req);
    const stages = Array.isArray(body.stages) ? body.stages as string[] : [];

    try {
      if (stages.includes('extract')) await runExtractStage(auth.userId, studyId);
      if (stages.includes('structure')) await runStructureStage(auth.userId, studyId);
      if (stages.includes('explain')) await runExplainStage(auth.userId, studyId);

      const detail = await loadStudyDetail(auth.userId, studyId);
      return res.status(200).json({ study: detail });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al reprocesar';
      return res.status(500).json({ error: message });
    }
  },

  'DELETE medical-studies/:id': async (_req, res, auth, segments) => {
    const studyId = segments[1];
    const supabase = getSupabase();
    const row = await getStudyRow(auth.userId, studyId);

    await supabase.storage.from(MEDICAL_STUDIES_BUCKET).remove([row.storage_path]);
    const { error } = await supabase
      .from('medical_studies')
      .delete()
      .eq('id', studyId)
      .eq('user_id', auth.userId);

    if (error) return res.status(500).json({ error: 'Error al eliminar estudio' });
    return res.status(200).json({ ok: true });
  },
};

function normalizeKey(method: string | undefined, segments: string[]): string {
  const s = [...segments];
  if (s[0] !== 'medical-studies') return routeKey(method, s);

  if (s[1] === 'upload' && !s[2]) return routeKey(method, ['medical-studies', 'upload']);
  if (s[1] === 'parameters' && s[2] === 'timeline') {
    return routeKey(method, ['medical-studies', 'parameters', 'timeline']);
  }
  if (s[1] && s[2] === 'file-url') {
    s[1] = ':id';
    return routeKey(method, s);
  }
  if (s[1] && ['extract', 'structure', 'explain', 'reprocess'].includes(s[2] ?? '')) {
    s[1] = ':id';
    return routeKey(method, s);
  }
  if (s[1] && !s[2]) {
    s[1] = ':id';
    return routeKey(method, s);
  }

  return routeKey(method, s);
}

function routeKey(method: string | undefined, segments: string[]): string {
  return `${method ?? 'GET'} ${segments.join('/')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return withAuth(req, res, async (auth, segments) => {
    const key = normalizeKey(req.method, segments);
    const handlerFn = handlers[key];
    if (!handlerFn) {
      return res.status(404).json({ error: 'Route not found', key });
    }
    return handlerFn(req, res, auth, segments);
  });
}
