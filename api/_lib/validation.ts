export interface ValidationError {
  field: string;
  message: string;
}

export function validateUsername(username: string): ValidationError | null {
  if (!username || username.length < 3) {
    return { field: 'username', message: 'El usuario debe tener al menos 3 caracteres' };
  }
  if (username.length > 20) {
    return { field: 'username', message: 'El usuario no puede tener más de 20 caracteres' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { field: 'username', message: 'Solo letras, números y guiones bajos' };
  }
  return null;
}

export function validateEmail(email: string): ValidationError | null {
  if (!email) {
    return { field: 'email', message: 'El email es obligatorio' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { field: 'email', message: 'Email inválido' };
  }
  return null;
}

export function validatePassword(password: string): ValidationError | null {
  if (!password || password.length < 6) {
    return { field: 'password', message: 'La contraseña debe tener al menos 6 caracteres' };
  }
  if (password.length > 72) {
    return { field: 'password', message: 'La contraseña no puede tener más de 72 caracteres' };
  }
  return null;
}

export function validateDisplayName(name: string): ValidationError | null {
  if (name && name.length > 50) {
    return { field: 'displayName', message: 'El nombre no puede tener más de 50 caracteres' };
  }
  return null;
}
