import type { MedicalStudyRow, MedicalStudyStructuredData } from './medicalStudyTypes.js';

export function mapStudySummary(row: MedicalStudyRow, parameterCount = 0) {
  return {
    id: row.id,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSizeBytes: Number(row.file_size_bytes),
    status: row.status,
    processingError: row.processing_error ?? undefined,
    studyType: row.study_type ?? undefined,
    studyDate: row.study_date ?? undefined,
    laboratory: row.laboratory ?? undefined,
    parameterCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapStudyDetail(
  row: MedicalStudyRow,
  parameters: Array<Record<string, unknown>>,
) {
  return {
    ...mapStudySummary(row, parameters.length),
    storagePath: row.storage_path,
    extractedText: row.extracted_text ?? undefined,
    extractionMethod: row.extraction_method ?? undefined,
    extractedAt: row.extracted_at ?? undefined,
    structuredData: (row.structured_data as MedicalStudyStructuredData | null) ?? undefined,
    structuredModel: row.structured_model ?? undefined,
    structuredAt: row.structured_at ?? undefined,
    patientExplanation: row.patient_explanation ?? undefined,
    explanationModel: row.explanation_model ?? undefined,
    explainedAt: row.explained_at ?? undefined,
    parameters: parameters.map((p) => ({
      id: p.id as string,
      parameterKey: p.parameter_key as string,
      parameterName: p.parameter_name as string,
      valueNumeric: p.value_numeric != null ? Number(p.value_numeric) : undefined,
      valueText: (p.value_text as string | null) ?? undefined,
      unit: (p.unit as string | null) ?? undefined,
      referenceRange: (p.reference_range as string | null) ?? undefined,
      referenceMin: p.reference_min != null ? Number(p.reference_min) : undefined,
      referenceMax: p.reference_max != null ? Number(p.reference_max) : undefined,
      flag: (p.flag as string | null) ?? undefined,
      section: (p.section as string | null) ?? undefined,
      sortOrder: Number(p.sort_order ?? 0),
    })),
  };
}
