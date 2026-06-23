import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, Leaf, LogIn, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/useAuthStore';
import { AUTH_THEME, authInputClass } from './authTheme';

export const LoginScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const authState = useAuthStore((s) => s.authState);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
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
    if (!identifier.trim() || !password.trim() || isLoading) return;
    login(identifier.trim(), password);
  };

  return (
    <div
      className="min-h-dvh flex flex-col animate-fade-in"
      style={{ backgroundColor: AUTH_THEME.cream, color: AUTH_THEME.ink }}
    >
      <div className="flex-1 flex flex-col px-5 pt-10 pb-4 max-w-md mx-auto w-full overflow-y-auto">
        {/* Marca */}
        <header className="flex flex-col items-center gap-6 mb-8">
          <div className="flex items-center gap-2">
            <Leaf className="shrink-0" size={22} strokeWidth={2.2} style={{ color: AUTH_THEME.forest }} />
            <span className="font-heading font-bold text-xl tracking-tight" style={{ color: AUTH_THEME.forest }}>
              NutriKal
            </span>
          </div>

          <div className="text-center space-y-3 px-1">
            <h1 className="font-heading font-bold text-[1.65rem] leading-tight text-[#1a1a18] tracking-tight">
              Bienvenido de nuevo a tu{' '}
              <span style={{ color: AUTH_THEME.forest }}>diario vivo.</span>
            </h1>
            <p className="text-sm font-body leading-relaxed max-w-[22rem] mx-auto" style={{ color: AUTH_THEME.muted }}>
              Nutrí tu cuerpo, registrá tu evolución y encontrá tu equilibrio natural.
            </p>
          </div>
        </header>

        {/* Tarjeta */}
        <div className="bg-white rounded-[1.75rem] shadow-[0_8px_40px_-12px_rgba(45,90,67,0.18)] border border-black/[0.04] px-5 py-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-[10px] font-body font-semibold tracking-[0.14em] uppercase mb-2"
                style={{ color: AUTH_THEME.muted }}
              >
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="hola@nutrikal.com"
                className={authInputClass}
                disabled={isLoading}
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="login-pass"
                  className="text-[10px] font-body font-semibold tracking-[0.14em] uppercase"
                  style={{ color: AUTH_THEME.muted }}
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-[10px] font-body font-semibold tracking-wide"
                  style={{ color: AUTH_THEME.forest }}
                  title="Próximamente"
                >
                  ¿Olvidaste?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-pass"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={clsx(authInputClass, 'pr-12')}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/[0.04] transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff size={18} className="text-neutral-500" />
                  ) : (
                    <Eye size={18} className="text-neutral-500" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!identifier.trim() || !password.trim() || isLoading}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-body font-semibold text-white min-h-[52px] transition-opacity shadow-[0_6px_20px_-6px_rgba(45,90,67,0.45)]',
                'disabled:opacity-45 disabled:pointer-events-none',
              )}
              style={{ backgroundColor: AUTH_THEME.forest }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Entrando…
                </>
              ) : (
                'Entrar'
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

          <div className="relative flex items-center gap-3 py-1">
            <div className="h-px flex-1" style={{ backgroundColor: AUTH_THEME.line }} />
            <span
              className="text-[10px] font-body font-semibold tracking-[0.12em] uppercase shrink-0"
              style={{ color: AUTH_THEME.muted }}
            >
              o continuá con
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: AUTH_THEME.line }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              title="Próximamente"
              className="flex items-center justify-center gap-2 py-3 rounded-full text-xs font-body font-medium bg-white border border-black/[0.08] text-neutral-400 cursor-not-allowed opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              disabled
              title="Próximamente"
              className="flex items-center justify-center gap-2 py-3 rounded-full text-xs font-body font-medium bg-white border border-black/[0.08] text-neutral-400 cursor-not-allowed opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Apple
            </button>
          </div>
        </div>

        <p className="text-center text-sm font-body mt-6" style={{ color: AUTH_THEME.muted }}>
          ¿Nuevo en el diario?{' '}
          <button
            type="button"
            onClick={() => setAuthView('register')}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: AUTH_THEME.forest }}
          >
            Crear cuenta
          </button>
        </p>
      </div>

      {/* Barra inferior: Unirse | Entrar */}
      <nav
        className="sticky bottom-0 z-10 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 border-t border-black/[0.06]"
        style={{ backgroundColor: AUTH_THEME.cream }}
      >
        <div className="flex w-full max-w-md rounded-full p-1 gap-1 bg-black/[0.04]">
          <button
            type="button"
            onClick={() => setAuthView('register')}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-full min-h-[56px] text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <UserPlus size={20} strokeWidth={1.75} />
            <span className="text-[10px] font-body font-semibold tracking-wide">Unirse</span>
          </button>
          <button
            type="button"
            aria-current="page"
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-full min-h-[56px] text-white shadow-md"
            style={{ backgroundColor: AUTH_THEME.forest }}
          >
            <LogIn size={20} strokeWidth={2} />
            <span className="text-[10px] font-body font-semibold tracking-wide">Entrar</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
