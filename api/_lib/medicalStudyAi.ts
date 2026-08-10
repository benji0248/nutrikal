import { getGeminiClient } from './gemini.js';
import {
  GEMINI_MEDICAL_MODEL,
  type MedicalStudyStructuredData,
  type StructuredParameter,
} from './medicalStudyTypes.js';

const STRUCTURE_PROMPT = `Sos un asistente que estructura resultados de estudios médicos/laboratorio.

Analizá el texto extraído de un estudio y devolvé JSON válido con esta forma exacta:
{
  "studyType": "tipo de estudio (ej: Hemograma, Perfil lipídico, Glucemia)",
  "studyDate": "YYYY-MM-DD o null si no se encuentra",
  "laboratory": "nombre del laboratorio o null",
  "observations": "observaciones generales del informe o null",
  "parameters": [
    {
      "parameterKey": "clave_normalizada_snake_case_en_español (ej: glucosa, colesterol_total, vitamina_d)",
      "parameterName": "nombre tal como aparece en el documento",
      "value": "valor como string",
      "valueNumeric": 123.4,
      "unit": "unidad o null",
      "referenceRange": "rango impreso o null",
      "referenceMin": 70,
      "referenceMax": 100,
      "flag": "normal|high|low|critical|unknown",
      "section": "sección del informe o null"
    }
  ]
}

Reglas:
- parameterKey debe ser estable para comparar el mismo analito entre estudios de distintos laboratorios.
- Si el valor no es numérico, valueNumeric puede ser null.
- No inventes datos que no estén en el texto.
- Incluí todos los parámetros medidos que encuentres.
- Respondé SOLO con JSON, sin markdown ni texto extra.`;

function parseJsonResponse(raw: string): MedicalStudyStructuredData {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  const parsed = JSON.parse(cleaned) as MedicalStudyStructuredData;
  if (!Array.isArray(parsed.parameters)) {
    parsed.parameters = [];
  }
  return parsed;
}

function normalizeParameter(param: StructuredParameter, index: number): StructuredParameter {
  const key = (param.parameterKey || param.parameterName || `param_${index}`)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return {
    ...param,
    parameterKey: key || `param_${index}`,
    parameterName: param.parameterName || param.parameterKey || `Parámetro ${index + 1}`,
    flag: param.flag ?? 'unknown',
  };
}

export async function structureStudyText(extractedText: string): Promise<{
  data: MedicalStudyStructuredData;
  model: string;
}> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MEDICAL_MODEL,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${STRUCTURE_PROMPT}\n\n--- TEXTO DEL ESTUDIO ---\n${extractedText}` }],
      },
    ],
  });

  const raw = result.response.text();
  const data = parseJsonResponse(raw);
  data.parameters = data.parameters.map(normalizeParameter);

  return { data, model: GEMINI_MEDICAL_MODEL };
}

const EXPLAIN_PROMPT = `Sos un asistente de salud que explica resultados de laboratorio en lenguaje claro para pacientes hispanohablantes.

Recibirás datos estructurados de un estudio médico. Escribí una explicación educativa que:
1. Resuma de qué trata el estudio y cuándo se realizó (si hay fecha).
2. Explique los parámetros más relevantes y qué significan sus valores.
3. Mencione valores fuera de rango de forma calmada y sin alarmismo.
4. Use párrafos cortos y lenguaje accesible (evitá jerga médica innecesaria).
5. Cierre con un disclaimer breve: esto es orientativo y no reemplaza la consulta con un profesional de salud.

NO des diagnósticos. NO recetes tratamientos. NO digas "tenés X enfermedad".
Respondé en español, en texto plano con párrafos separados por líneas en blanco.`;

export async function explainStructuredStudy(
  structured: MedicalStudyStructuredData,
): Promise<{ explanation: string; model: string }> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MEDICAL_MODEL,
    generationConfig: { temperature: 0.4 },
  });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${EXPLAIN_PROMPT}\n\n--- DATOS ESTRUCTURADOS ---\n${JSON.stringify(structured, null, 2)}`,
          },
        ],
      },
    ],
  });

  return {
    explanation: result.response.text().trim(),
    model: GEMINI_MEDICAL_MODEL,
  };
}
