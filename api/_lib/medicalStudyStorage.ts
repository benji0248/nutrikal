import { getSupabase } from './supabase.js';
import { MEDICAL_STUDIES_BUCKET, type MedicalStudyRow } from './medicalStudyTypes.js';

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

export async function downloadStudyFile(storagePath: string): Promise<Buffer> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(MEDICAL_STUDIES_BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo descargar el archivo original');
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
