import type {
  MedicalStudyDetail,
  MedicalStudySummary,
  ParameterTimelinePoint,
} from '../types';

const JWT_KEY = 'nutrikal-jwt';

function getToken(): string | null {
  return localStorage.getItem(JWT_KEY);
}

function authHeaders(contentType?: string): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = contentType;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Error inesperado');
  }
  return data as T;
}

export async function listMedicalStudies(): Promise<MedicalStudySummary[]> {
  const res = await fetch('/api/medical-studies', { headers: authHeaders('application/json') });
  const data = await handleJson<{ studies: MedicalStudySummary[] }>(res);
  return data.studies;
}

export async function getMedicalStudy(id: string): Promise<MedicalStudyDetail> {
  const res = await fetch(`/api/medical-studies/${encodeURIComponent(id)}`, {
    headers: authHeaders('application/json'),
  });
  const data = await handleJson<{ study: MedicalStudyDetail }>(res);
  return data.study;
}

export async function uploadMedicalStudy(file: File): Promise<MedicalStudyDetail> {
  const mimeType = file.type === 'image/jpg' ? 'image/jpeg' : (file.type || 'application/octet-stream');

  const initRes = await fetch('/api/medical-studies/upload-init', {
    method: 'POST',
    headers: authHeaders('application/json'),
    body: JSON.stringify({
      filename: file.name,
      mimeType,
      fileSizeBytes: file.size,
    }),
  });

  const init = await handleJson<{
    study: MedicalStudySummary;
    upload: { signedUrl: string; token: string; path: string };
  }>(initRes);

  const uploadRes = await fetch(init.upload.signedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': mimeType },
  });

  if (!uploadRes.ok) {
    throw new Error('Error al subir el archivo a storage');
  }

  const completeRes = await fetch(
    `/api/medical-studies/${encodeURIComponent(init.study.id)}/upload-complete`,
    {
      method: 'POST',
      headers: authHeaders('application/json'),
    },
  );

  const complete = await handleJson<{ study: MedicalStudyDetail }>(completeRes);
  return complete.study;
}

export async function extractMedicalStudy(id: string): Promise<MedicalStudyDetail> {
  const res = await fetch(`/api/medical-studies/${encodeURIComponent(id)}/extract`, {
    method: 'POST',
    headers: authHeaders('application/json'),
  });
  const data = await handleJson<{ study: MedicalStudyDetail }>(res);
  return data.study;
}

export async function structureMedicalStudy(id: string): Promise<MedicalStudyDetail> {
  const res = await fetch(`/api/medical-studies/${encodeURIComponent(id)}/structure`, {
    method: 'POST',
    headers: authHeaders('application/json'),
  });
  const data = await handleJson<{ study: MedicalStudyDetail }>(res);
  return data.study;
}

export async function explainMedicalStudy(id: string): Promise<MedicalStudyDetail> {
  const res = await fetch(`/api/medical-studies/${encodeURIComponent(id)}/explain`, {
    method: 'POST',
    headers: authHeaders('application/json'),
  });
  const data = await handleJson<{ study: MedicalStudyDetail }>(res);
  return data.study;
}

export async function reprocessMedicalStudy(
  id: string,
  stages: Array<'extract' | 'structure' | 'explain'>,
): Promise<MedicalStudyDetail> {
  const res = await fetch(`/api/medical-studies/${encodeURIComponent(id)}/reprocess`, {
    method: 'POST',
    headers: authHeaders('application/json'),
    body: JSON.stringify({ stages }),
  });
  const data = await handleJson<{ study: MedicalStudyDetail }>(res);
  return data.study;
}

export async function deleteMedicalStudy(id: string): Promise<void> {
  const res = await fetch(`/api/medical-studies/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders('application/json'),
  });
  await handleJson<{ ok: boolean }>(res);
}

export async function getMedicalStudyFileUrl(id: string): Promise<{
  url: string;
  mimeType: string;
  filename: string;
}> {
  const res = await fetch(`/api/medical-studies/${encodeURIComponent(id)}/file-url`, {
    headers: authHeaders('application/json'),
  });
  return handleJson(res);
}

export async function getParameterTimeline(parameterKey: string): Promise<{
  parameterKey: string;
  points: ParameterTimelinePoint[];
}> {
  const res = await fetch(
    `/api/medical-studies/parameters/timeline?parameterKey=${encodeURIComponent(parameterKey)}`,
    { headers: authHeaders('application/json') },
  );
  return handleJson(res);
}
