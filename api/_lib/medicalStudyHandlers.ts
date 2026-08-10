import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './supabase.js';
import { mapStudyDetail, mapStudySummary } from './medicalStudyMapper.js';
import { createSignedFileUrl, getStudyRow } from './medicalStudyStorage.js';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
  MEDICAL_STUDIES_BUCKET,
  type MedicalStudyRow,
} from './medicalStudyTypes.js';

interface MedicalAuth {
  userId: string;
}

type MedicalRouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
  auth: MedicalAuth,
  segments: string[],
) => Promise<VercelResponse | void>;

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

export const medicalStudyHandlers: Record<string, MedicalRouteHandler> = {
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
      if (!studyRow) return null;
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

  'POST medical-studies/upload-init': async (req, res, auth) => {
    try {
      const body = req.body ?? {};
      const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
      const rawMime = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
      const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
      const fileSizeBytes = Number(body.fileSizeBytes ?? 0);

      if (!filename) return res.status(400).json({ error: 'filename requerido' });
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({ error: 'Formato no soportado. Usá PDF, JPG, PNG o WebP.' });
      }
      if (!fileSizeBytes || fileSizeBytes > MAX_FILE_BYTES) {
        return res.status(400).json({ error: 'Tamaño de archivo inválido (máx. 50 MB).' });
      }

      const studyId = randomUUID();
      const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
      const storagePath = `${auth.userId}/${studyId}.${ext}`;
      const supabase = getSupabase();

      const { data: signed, error: signedError } = await supabase.storage
        .from(MEDICAL_STUDIES_BUCKET)
        .createSignedUploadUrl(storagePath);

      if (signedError || !signed) {
        return res.status(500).json({
          error: 'Error al preparar subida',
          detail: signedError?.message ?? 'No se pudo crear URL firmada',
        });
      }

      const { data, error } = await supabase
        .from('medical_studies')
        .insert({
          id: studyId,
          user_id: auth.userId,
          original_filename: filename,
          mime_type: mimeType,
          file_size_bytes: fileSizeBytes,
          storage_path: storagePath,
          status: 'uploaded',
        })
        .select('*')
        .single();

      if (error || !data) {
        return res.status(500).json({
          error: 'Error al registrar estudio',
          detail: error?.message ?? null,
        });
      }

      return res.status(201).json({
        study: mapStudySummary(data as MedicalStudyRow, 0),
        upload: {
          signedUrl: signed.signedUrl,
          token: signed.token,
          path: signed.path,
        },
      });
    } catch (err) {
      console.error('[medical-studies] upload-init error:', err);
      return res.status(500).json({
        error: 'Error al iniciar subida',
        detail: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  },

  'POST medical-studies/:id/upload-complete': async (_req, res, auth, segments) => {
    const studyId = segments[1];
    const row = await getStudyRow(auth.userId, studyId);
    const supabase = getSupabase();

    const folder = row.storage_path.split('/').slice(0, -1).join('/');
    const name = row.storage_path.split('/').pop() ?? '';
    const { data: listed, error: listError } = await supabase.storage
      .from(MEDICAL_STUDIES_BUCKET)
      .list(folder || undefined, { search: name });

    if (listError || !listed?.some((item) => item.name === name)) {
      return res.status(400).json({ error: 'El archivo aún no está disponible en storage' });
    }

    await supabase
      .from('medical_studies')
      .update({ status: 'uploaded', updated_at: new Date().toISOString() })
      .eq('id', studyId)
      .eq('user_id', auth.userId);

    const detail = await loadStudyDetail(auth.userId, studyId);
    return res.status(200).json({ study: detail });
  },

  'POST medical-studies/:id/extract': async (_req, res, auth, segments) => {
    const studyId = segments[1];
    try {
      const { runExtractStage } = await import('./medicalStudyPipeline.js');
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
      const { runStructureStage } = await import('./medicalStudyPipeline.js');
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
      const { runExplainStage } = await import('./medicalStudyPipeline.js');
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
    const stages = Array.isArray(req.body?.stages) ? req.body.stages as string[] : [];

    try {
      const { runExtractStage, runStructureStage, runExplainStage } = await import('./medicalStudyPipeline.js');
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

export function normalizeMedicalStudyKey(method: string | undefined, segments: string[]): string | null {
  const s = [...segments];
  if (s[0] !== 'medical-studies') return null;

  if (s[1] === 'upload-init' && !s[2]) return routeKey(method, ['medical-studies', 'upload-init']);
  if (s[1] === 'parameters' && s[2] === 'timeline') {
    return routeKey(method, ['medical-studies', 'parameters', 'timeline']);
  }
  if (s[1] && s[2] === 'file-url') {
    s[1] = ':id';
    return routeKey(method, s);
  }
  if (s[1] && ['extract', 'structure', 'explain', 'reprocess', 'upload-complete'].includes(s[2] ?? '')) {
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
