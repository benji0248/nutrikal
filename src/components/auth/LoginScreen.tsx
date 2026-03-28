import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/useAuthStore';

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
    <div className="min-h-dvh bg-bg flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto">
            <span className="text-accent font-heading font-bold text-2xl">N</span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">NutriKal</h1>
          <p className="text-sm font-body text-muted">Tu nutrición, organizada</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Usuario o email"
            className="w-full px-4 py-3 bg-surface2 rounded-2xl text-sm font-body text-text-primary placeholder-muted/50 border border-border/40 focus:border-accent/50 outline-none transition-all"
            disabled={isLoading}
            autoComplete="username"
            autoCapitalize="none"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-4 py-3 pr-12 bg-surface2 rounded-2xl text-sm font-body text-text-primary placeholder-muted/50 border border-border/40 focus:border-accent/50 outline-none transition-all"
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-surface2 transition-colors"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <EyeOff size={16} className="text-muted" />
              ) : (
                <Eye size={16} className="text-muted" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={!identifier.trim() || !password.trim() || isLoading}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-body font-medium transition-all min-h-[48px]',
              'bg-accent text-white hover:bg-accent/85 shadow-lg shadow-accent/20',
              'disabled:opacity-40 disabled:pointer-events-none',
            )}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>

          {/* Error message */}
          {error && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 animate-fade-in">
              <p className="text-sm font-body text-amber-400">{error}</p>
            </div>
          )}
        </form>

        {/* Switch to register */}
        <p className="text-sm font-body text-muted text-center">
          ¿No tenés cuenta?{' '}
          <button
            onClick={() => setAuthView('register')}
            className="text-accent hover:underline font-medium"
          >
            Registrate
          </button>
        </p>

        {/* Privacy note */}
        <p className="text-[11px] font-body text-muted/60 text-center leading-relaxed">
          Tus datos de nutrición se guardan en este dispositivo.
        </p>
      </div>
    </div>
  );
};
