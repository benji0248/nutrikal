import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/jwt.js';
import { getSupabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = verifyToken(auth.slice(7));
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('user_data')
      .select('data, updated_at')
      .eq('user_id', decoded.sub)
      .single();

    if (error && error.code === 'PGRST116') {
      // No row found — return empty
      return res.status(200).json({ data: null, updatedAt: null });
    }

    if (error) {
      return res.status(500).json({ error: 'Error al leer datos' });
    }

    return res.status(200).json({
      data: data.data,
      updatedAt: data.updated_at,
    });
  } catch (err) {
    if ((err as Error).name === 'JsonWebTokenError' || (err as Error).name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    console.error('Load data error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
