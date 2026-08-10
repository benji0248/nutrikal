import Busboy from 'busboy';
import type { IncomingHttpHeaders } from 'node:http';

export interface ParsedUpload {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export async function parseMultipartUpload(
  body: Buffer,
  headers: IncomingHttpHeaders,
): Promise<ParsedUpload> {
  const contentType = headers['content-type'] ?? headers['Content-Type'];
  if (!contentType || !String(contentType).includes('multipart/form-data')) {
    throw new Error('Se esperaba multipart/form-data');
  }

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: { 'content-type': String(contentType) } });
    let resolved = false;
    let fileBuffer: Buffer | null = null;
    let filename = 'documento';
    let mimeType = 'application/octet-stream';

    busboy.on('file', (_field, file, info) => {
      filename = info.filename || filename;
      mimeType = info.mimeType || mimeType;
      const chunks: Buffer[] = [];
      file.on('data', (chunk: Buffer) => chunks.push(chunk));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    busboy.on('finish', () => {
      if (resolved) return;
      resolved = true;
      if (!fileBuffer || fileBuffer.length === 0) {
        reject(new Error('No se recibió ningún archivo'));
        return;
      }
      resolve({ filename, mimeType, buffer: fileBuffer });
    });

    busboy.end(body);
  });
}
