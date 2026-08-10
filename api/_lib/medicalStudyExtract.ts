import pdf from 'pdf-parse/lib/pdf-parse.js';
import { getGeminiClient } from './gemini.js';
import { GEMINI_MEDICAL_MODEL } from './medicalStudyTypes.js';

const MIN_NATIVE_TEXT_CHARS = 120;

async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdf(buffer);
  return (result.text ?? '').trim();
}

async function extractWithGeminiOcr(buffer: Buffer, mimeType: string): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: GEMINI_MEDICAL_MODEL });
  const base64 = buffer.toString('base64');

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: `Extraé TODO el texto visible de este documento médico/laboratorio.
Respetá saltos de línea y la estructura de tablas lo mejor posible.
No interpretes ni resumas: solo transcribí el contenido textual tal como aparece.
Respondé únicamente con el texto extraído, sin comentarios adicionales.`,
          },
        ],
      },
    ],
  });

  return result.response.text().trim();
}

export async function extractStudyText(
  buffer: Buffer,
  mimeType: string,
): Promise<{ text: string; method: 'pdf_text' | 'ocr_gemini' }> {
  if (mimeType === 'application/pdf') {
    try {
      const nativeText = await extractPdfText(buffer);
      if (nativeText.length >= MIN_NATIVE_TEXT_CHARS) {
        return { text: nativeText, method: 'pdf_text' };
      }
    } catch (err) {
      console.warn('[medical-studies] pdf-parse failed, falling back to OCR:', err);
    }
    const ocrText = await extractWithGeminiOcr(buffer, mimeType);
    return { text: ocrText, method: 'ocr_gemini' };
  }

  if (mimeType.startsWith('image/')) {
    const ocrText = await extractWithGeminiOcr(buffer, mimeType);
    return { text: ocrText, method: 'ocr_gemini' };
  }

  throw new Error(`Tipo de archivo no soportado para extracción: ${mimeType}`);
}
