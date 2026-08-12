import type {
  MedicalParameterFlag,
  MedicalStudyDetail,
  MedicalStudyParameter,
  MedicalStudyStatus,
  MedicalStudySummary,
} from '../types';

const ABNORMAL_FLAGS: MedicalParameterFlag[] = ['high', 'low', 'critical'];

export function isAbnormalFlag(flag?: MedicalParameterFlag): boolean {
  return !!flag && ABNORMAL_FLAGS.includes(flag);
}

export function sortParameters(params: MedicalStudyParameter[]): {
  abnormal: MedicalStudyParameter[];
  normal: MedicalStudyParameter[];
} {
  const abnormal: MedicalStudyParameter[] = [];
  const normal: MedicalStudyParameter[] = [];

  for (const p of params) {
    if (isAbnormalFlag(p.flag)) abnormal.push(p);
    else normal.push(p);
  }

  const byOrder = (a: MedicalStudyParameter, b: MedicalStudyParameter) => a.sortOrder - b.sortOrder;
  abnormal.sort(byOrder);
  normal.sort(byOrder);

  return { abnormal, normal };
}

/** Evita duplicar unidades cuando valueText ya las trae (ej. "46.5 %"). */
export function formatParameterValue(param: MedicalStudyParameter): string {
  const raw =
    param.valueText?.trim() ??
    (param.valueNumeric != null ? String(param.valueNumeric) : '—');
  if (!param.unit || raw === '—') return raw;
  const unit = param.unit.trim();
  if (raw.toLowerCase().includes(unit.toLowerCase())) return raw;
  return `${raw} ${unit}`;
}

export function isProcessingStatus(status: MedicalStudyStatus): boolean {
  return !['completed', 'failed', 'uploaded'].includes(status);
}

export function summaryFromDetail(detail: MedicalStudyDetail): MedicalStudySummary {
  return {
    id: detail.id,
    originalFilename: detail.originalFilename,
    mimeType: detail.mimeType,
    fileSizeBytes: detail.fileSizeBytes,
    status: detail.status,
    processingError: detail.processingError,
    studyType: detail.studyType,
    studyDate: detail.studyDate,
    laboratory: detail.laboratory,
    parameterCount: detail.parameterCount,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

export function statusToProcessingStage(status: MedicalStudyStatus): string {
  switch (status) {
    case 'extracting':
      return 'extract';
    case 'structuring':
      return 'structure';
    case 'explaining':
      return 'explain';
    case 'extracted':
      return 'structure';
    case 'structured':
      return 'explain';
    default:
      return 'upload';
  }
}
