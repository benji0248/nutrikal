import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    return res.status(200).json({
      user: {
        id: payload.sub,
        username: payload.username,
        email: payload.email,
        displayName: payload.displayName,
      },
    });
  } catch {
    return res.status(401).json({ error: 'Sesión expirada. Volvé a iniciar sesión.' });
  }
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: (err as Error).message || 'Error interno del servidor' });
  }
}
