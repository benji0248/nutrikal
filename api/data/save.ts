import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getSupabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'PUT') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = verifyToken(auth.slice(7));
    const payload = req.body;

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Payload inválido' });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('user_data')
      .upsert(
        { user_id: decoded.sub, data: payload },
        { onConflict: 'user_id' },
      );

    if (error) {
      console.error('Save data error:', error);
      return res.status(500).json({ error: 'Error al guardar datos' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    if ((err as Error).name === 'JsonWebTokenError' || (err as Error).name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    console.error('Save data error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
