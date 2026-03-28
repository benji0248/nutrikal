import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase.js';
import { signToken } from '../_lib/jwt.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { identifier, password } = req.body ?? {};

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Ingresá tu usuario/email y contraseña' });
  }

  const supabase = getSupabase();
  const lower = (identifier as string).toLowerCase().trim();

  // Find user by username or email
  const { data: user } = await supabase
    .from('users')
    .select('id, username, email, password_hash, display_name')
    .or(`username.eq.${lower},email.eq.${lower}`)
    .single();

  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const valid = await bcrypt.compare(password as string, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const token = signToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    displayName: user.display_name,
  });

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
    },
  });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: (err as Error).message || 'Error interno del servidor' });
  }
}
