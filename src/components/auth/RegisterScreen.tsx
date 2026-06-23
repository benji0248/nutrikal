import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, Leaf, LogIn, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/useAuthStore';
import { AUTH_THEME, authInputClass } from './authTheme';

export const RegisterScreen = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const authState = useAuthStore((s) => s.authState);
  const error = useAuthStore((s) => s.error);
  const errorField = useAuthStore((s) => s.errorField);
  const register = useAuthStore((s) => s.register);
  const setAuthView = useAuthStore((s) => s.setAuthView);
  const clearError = useAuthStore((s) => s.clearError);

  const isLoading = authState === 'authenticating';

  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 5000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim() || isLoading) return;
    register(username.trim(), email.trim(), password, displayName.trim() || undefined);
  };

  const fieldError = (field: string) => errorField === field;

  return (
    <div
      className="min-h-dvh flex flex-col animate-fade-in"
      style={{ backgroundColor: AUTH_THEME.cream, color: AUTH_THEME.ink }}
    >
      <div className="flex-1 flex flex-col px-5 pt-10 pb-4 max-w-md mx-auto w-full overflow-y-auto">
        <header className="flex flex-col items-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <Leaf className="shrink-0" size={22} strokeWidth={2.2} style={{ color: AUTH_THEME.forest }} />
            <span className="font-heading font-bold text-xl tracking-tight" style={{ color: AUTH_THEME.forest }}>
              NutriKal
            </span>
          </div>

          <div className="text-center space-y-3 px-1">
            <h1 className="font-heading font-bold text-[1.65rem] leading-tight text-[#1a1a18] tracking-tight">
              Unite a tu{' '}
              <span style={{ color: AUTH_THEME.forest }}>diario vivo.</span>
            </h1>
            <p className="text-sm font-body leading-relaxed max-w-[22rem] mx-auto" style={{ color: AUTH_THEME.muted }}>
              Creá tu cuenta y empezá a planificar con calma.
            </p>
          </div>
        </header>

        <div className="bg-white rounded-[1.75rem] shadow-[0_8px_40px_-12px_rgba(45,90,67,0.18)] border border-black/[0.04] px-5 py-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="reg-name" className="block text-[10px] font-body font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: AUTH_THEME.muted }}>
                Nombre (opcional)
              </label>
              <input
                id="reg-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Cómo te decimos"
                className={clsx(authInputClass, fieldError('displayName') && 'ring-2 ring-amber-400/40')}
                disabled={isLoading}
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="reg-user" className="block text-[10px] font-body font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: AUTH_THEME.muted }}>
                Usuario
              </label>
              <input
                id="reg-user"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu_usuario"
                className={clsx(authInputClass, fieldError('username') && 'ring-2 ring-amber-400/40')}
                disabled={isLoading}
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-[10px] font-body font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: AUTH_THEME.muted }}>
                Correo electrónico
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hola@nutrikal.com"
                className={clsx(authInputClass, fieldError('email') && 'ring-2 ring-amber-400/40')}
                disabled={isLoading}
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>

            <div>
              <label htmlFor="reg-pass" className="block text-[10px] font-body font-semibold tracking-[0.14em] uppercase mb-2" style={{ color: AUTH_THEME.muted }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="reg-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={clsx(authInputClass, 'pr-12', fieldError('password') && 'ring-2 ring-amber-400/40')}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/[0.04] transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} className="text-neutral-500" /> : <Eye size={18} className="text-neutral-500" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!username.trim() || !email.trim() || !password.trim() || isLoading}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-body font-semibold text-white min-h-[52px] transition-opacity shadow-[0_6px_20px_-6px_rgba(45,90,67,0.45)]',
                'disabled:opacity-45 disabled:pointer-events-none',
              )}
              style={{ backgroundColor: AUTH_THEME.forest }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creando…
                </>
              ) : (
                'Crear cuenta'
              )}
            </button>

            {error && (
              <div
                className="rounded-2xl px-4 py-2.5 text-sm font-body border"
                style={{
                  backgroundColor: 'rgba(180, 83, 9, 0.08)',
                  borderColor: 'rgba(180, 83, 9, 0.25)',
                  color: '#92400e',
                }}
              >
                {error}
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-sm font-body mt-6" style={{ color: AUTH_THEME.muted }}>
          ¿Ya tenés cuenta?{' '}
          <button
            type="button"
            onClick={() => setAuthView('login')}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: AUTH_THEME.forest }}
          >
            Entrar
          </button>
        </p>
      </div>

      <nav
        className="sticky bottom-0 z-10 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 border-t border-black/[0.06]"
        style={{ backgroundColor: AUTH_THEME.cream }}
      >
        <div className="flex w-full max-w-md rounded-full p-1 gap-1 bg-black/[0.04]">
          <button
            type="button"
            aria-current="page"
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-full min-h-[56px] text-white shadow-md"
            style={{ backgroundColor: AUTH_THEME.forest }}
          >
            <UserPlus size={20} strokeWidth={2} />
            <span className="text-[10px] font-body font-semibold tracking-wide">Unirse</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthView('login')}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-full min-h-[56px] text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <LogIn size={20} strokeWidth={1.75} />
            <span className="text-[10px] font-body font-semibold tracking-wide">Entrar</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
