import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getSupabase } from '../_lib/supabase';
import { signToken } from '../_lib/jwt';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  validateDisplayName,
} from '../_lib/validation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password, displayName } = req.body ?? {};

  // Validate fields
  const errors = [
    validateUsername(username ?? ''),
    validateEmail(email ?? ''),
    validatePassword(password ?? ''),
    validateDisplayName(displayName ?? ''),
  ].filter(Boolean);

  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0]!.message, field: errors[0]!.field });
  }

  const supabase = getSupabase();

  // Check user limit
  const { data: configRow } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'max_users')
    .single();

  const maxUsers = configRow ? Number(configRow.value) : 30;

  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });

  if ((count ?? 0) >= maxUsers) {
    return res.status(403).json({
      error: 'Por ahora NutriKal tiene cupo limitado. Volvé a intentar más adelante.',
    });
  }

  // Check duplicates
  const lowerUsername = (username as string).toLowerCase();
  const lowerEmail = (email as string).toLowerCase();

  const { data: existing } = await supabase
    .from('users')
    .select('username, email')
    .or(`username.eq.${lowerUsername},email.eq.${lowerEmail}`);

  if (existing && existing.length > 0) {
    const taken = existing[0];
    if (taken.username === lowerUsername) {
      return res.status(409).json({ error: 'Ese usuario ya está en uso', field: 'username' });
    }
    return res.status(409).json({ error: 'Ese email ya está registrado', field: 'email' });
  }

  // Hash password and insert
  const passwordHash = await bcrypt.hash(password as string, 12);

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      username: lowerUsername,
      email: lowerEmail,
      password_hash: passwordHash,
      display_name: (displayName as string)?.trim() || lowerUsername,
    })
    .select('id, username, email, display_name')
    .single();

  if (insertError) {
    return res.status(500).json({ error: 'Error al crear la cuenta. Intentá de nuevo.' });
  }

  const token = signToken({
    sub: newUser.id,
    username: newUser.username,
    email: newUser.email,
    displayName: newUser.display_name,
  });

  return res.status(201).json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      displayName: newUser.display_name,
    },
  });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: (err as Error).message || 'Error interno del servidor' });
  }
}
