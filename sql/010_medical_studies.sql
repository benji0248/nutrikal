-- Medical studies module: decoupled pipeline stages
-- Apply after 009_ai_observability.sql

-- Storage bucket (private per user via path prefix user_id/)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('medical-studies', 'medical-studies', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Main study record — each processing stage has its own columns/timestamps
CREATE TABLE IF NOT EXISTS medical_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN (
      'uploaded', 'extracting', 'extracted', 'structuring', 'structured',
      'explaining', 'completed', 'failed'
    )),
  processing_error TEXT,
  -- Stage 1: text extraction (PDF native or OCR)
  extracted_text TEXT,
  extraction_method TEXT CHECK (extraction_method IS NULL OR extraction_method IN ('pdf_text', 'ocr_gemini')),
  extracted_at TIMESTAMPTZ,
  -- Stage 2: AI structured interpretation
  structured_data JSONB,
  structured_model TEXT,
  structured_at TIMESTAMPTZ,
  -- Stage 3: patient-friendly explanation
  patient_explanation TEXT,
  explanation_model TEXT,
  explained_at TIMESTAMPTZ,
  -- Denormalized fields for list/sort/filter (from structured_data)
  study_type TEXT,
  study_date DATE,
  laboratory TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_studies_user_created
  ON medical_studies (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medical_studies_user_study_date
  ON medical_studies (user_id, study_date DESC NULLS LAST);

-- Normalized parameters for cross-study comparison
CREATE TABLE IF NOT EXISTS medical_study_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES medical_studies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parameter_key TEXT NOT NULL,
  parameter_name TEXT NOT NULL,
  value_numeric DOUBLE PRECISION,
  value_text TEXT,
  unit TEXT,
  reference_range TEXT,
  reference_min DOUBLE PRECISION,
  reference_max DOUBLE PRECISION,
  flag TEXT CHECK (flag IS NULL OR flag IN ('normal', 'high', 'low', 'critical', 'unknown')),
  section TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_study_params_user_key
  ON medical_study_parameters (user_id, parameter_key);

CREATE INDEX IF NOT EXISTS idx_medical_study_params_study
  ON medical_study_parameters (study_id);

-- RLS on tables (service role bypasses; direct client access blocked)
ALTER TABLE medical_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_study_parameters ENABLE ROW LEVEL SECURITY;

-- Storage: accessed only via API using service role (custom JWT auth, not Supabase Auth)
