import { randomUUID } from 'node:crypto';
import { getSupabase } from './supabase.js';
import { extractStudyText } from './medicalStudyExtract.js';
import { explainStructuredStudy, structureStudyText } from './medicalStudyAi.js';
import {
  MEDICAL_STUDIES_BUCKET,
  type MedicalStudyRow,
  type MedicalStudyStructuredData,
} from './medicalStudyTypes.js';

export async function downloadStudyFile(storagePath: string): Promise<Buffer> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(MEDICAL_STUDIES_BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo descargar el archivo original');
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getStudyRow(userId: string, studyId: string): Promise<MedicalStudyRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('medical_studies')
    .select('*')
    .eq('id', studyId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error('Estudio no encontrado');
  }
  return data as MedicalStudyRow;
}

async function updateStudy(studyId: string, userId: string, patch: Record<string, unknown>) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('medical_studies')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', studyId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

async function replaceParameters(
  studyId: string,
  userId: string,
  structured: MedicalStudyStructuredData,
) {
  const supabase = getSupabase();
  await supabase.from('medical_study_parameters').delete().eq('study_id', studyId).eq('user_id', userId);

  if (!structured.parameters.length) return;

  const rows = structured.parameters.map((p, index) => ({
    id: randomUUID(),
    study_id: studyId,
    user_id: userId,
    parameter_key: p.parameterKey,
    parameter_name: p.parameterName,
    value_numeric: p.valueNumeric ?? null,
    value_text: p.value ?? null,
    unit: p.unit ?? null,
    reference_range: p.referenceRange ?? null,
    reference_min: p.referenceMin ?? null,
    reference_max: p.referenceMax ?? null,
    flag: p.flag ?? 'unknown',
    section: p.section ?? null,
    sort_order: index,
  }));

  const { error } = await supabase.from('medical_study_parameters').insert(rows);
  if (error) throw new Error(error.message);
}

export async function runExtractStage(userId: string, studyId: string) {
  const row = await getStudyRow(userId, studyId);
  await updateStudy(studyId, userId, { status: 'extracting', processing_error: null });

  try {
    const buffer = await downloadStudyFile(row.storage_path);
    const { text, method } = await extractStudyText(buffer, row.mime_type);

    if (!text.trim()) {
      throw new Error('No se pudo extraer texto del documento');
    }

    await updateStudy(studyId, userId, {
      status: 'extracted',
      extracted_text: text,
      extraction_method: method,
      extracted_at: new Date().toISOString(),
    });

    return { text, method };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error en extracción';
    await updateStudy(studyId, userId, { status: 'failed', processing_error: message });
    throw err;
  }
}

export async function runStructureStage(userId: string, studyId: string) {
  const row = await getStudyRow(userId, studyId);
  if (!row.extracted_text?.trim()) {
    throw new Error('El estudio no tiene texto extraído. Ejecutá extracción primero.');
  }

  await updateStudy(studyId, userId, { status: 'structuring', processing_error: null });

  try {
    const { data, model } = await structureStudyText(row.extracted_text);
    await replaceParameters(studyId, userId, data);

    await updateStudy(studyId, userId, {
      status: 'structured',
      structured_data: data,
      structured_model: model,
      structured_at: new Date().toISOString(),
      study_type: data.studyType ?? null,
      study_date: data.studyDate ?? null,
      laboratory: data.laboratory ?? null,
    });

    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al estructurar';
    await updateStudy(studyId, userId, { status: 'failed', processing_error: message });
    throw err;
  }
}

export async function runExplainStage(userId: string, studyId: string) {
  const row = await getStudyRow(userId, studyId);
  const structured = row.structured_data as MedicalStudyStructuredData | null;
  if (!structured) {
    throw new Error('El estudio no tiene datos estructurados. Ejecutá estructuración primero.');
  }

  await updateStudy(studyId, userId, { status: 'explaining', processing_error: null });

  try {
    const { explanation, model } = await explainStructuredStudy(structured);

    await updateStudy(studyId, userId, {
      status: 'completed',
      patient_explanation: explanation,
      explanation_model: model,
      explained_at: new Date().toISOString(),
    });

    return explanation;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al generar explicación';
    await updateStudy(studyId, userId, { status: 'failed', processing_error: message });
    throw err;
  }
}

export async function createSignedFileUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(MEDICAL_STUDIES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'No se pudo generar URL del archivo');
  }
  return data.signedUrl;
}
