export type MedicalStudyStatus =
  | 'uploaded'
  | 'extracting'
  | 'extracted'
  | 'structuring'
  | 'structured'
  | 'explaining'
  | 'completed'
  | 'failed';

export type MedicalParameterFlag = 'normal' | 'high' | 'low' | 'critical' | 'unknown';

export interface StructuredParameter {
  parameterKey: string;
  parameterName: string;
  value?: string;
  valueNumeric?: number;
  unit?: string;
  referenceRange?: string;
  referenceMin?: number;
  referenceMax?: number;
  flag?: MedicalParameterFlag;
  section?: string;
}

export interface MedicalStudyStructuredData {
  studyType?: string;
  studyDate?: string;
  laboratory?: string;
  observations?: string;
  parameters: StructuredParameter[];
}

export interface MedicalStudyRow {
  id: string;
  user_id: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path: string;
  status: MedicalStudyStatus;
  processing_error: string | null;
  extracted_text: string | null;
  extraction_method: 'pdf_text' | 'ocr_gemini' | null;
  extracted_at: string | null;
  structured_data: MedicalStudyStructuredData | null;
  structured_model: string | null;
  structured_at: string | null;
  patient_explanation: string | null;
  explanation_model: string | null;
  explained_at: string | null;
  study_type: string | null;
  study_date: string | null;
  laboratory: string | null;
  created_at: string;
  updated_at: string;
}

export const MEDICAL_STUDIES_BUCKET = 'medical-studies';
export const GEMINI_MEDICAL_MODEL = 'gemini-2.5-flash';

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
