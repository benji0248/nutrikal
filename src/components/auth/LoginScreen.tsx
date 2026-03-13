import { useState, useEffect } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronUp, ExternalLink, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/useAuthStore';

export function LoginScreen() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const authState = useAuthStore((s) => s.authState);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);

  const isLoading = authState === 'authenticating';

  // Auto-dismiss error after 5s
  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 5000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || isLoading) return;
    login(token.trim());
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
          <p className="text-sm font-body text-muted">Tu calendario de nutrición</p>
        </div>

        {/* Instructions panel */}
        <div className="bg-surface2/40 rounded-2xl border border-border/40 overflow-hidden">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface2/60 transition-colors"
          >
            <span className="text-sm font-body font-medium text-text-primary">
              ¿Cómo conectar tu cuenta?
            </span>
            {showInstructions ? (
              <ChevronUp size={16} className="text-muted" />
            ) : (
              <ChevronDown size={16} className="text-muted" />
            )}
          </button>
          {showInstructions && (
            <div className="px-4 pb-4 space-y-2 text-sm font-body text-muted">
              <ol className="space-y-2 list-decimal list-inside">
                <li>
                  Abrí{' '}
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-1"
                  >
                    github.com/settings/tokens
                    <ExternalLink size={12} />
                  </a>
                </li>
                <li>Nombre: <span className="text-text-primary font-medium">"NutriKal"</span></li>
                <li>Expiration: <span className="text-text-primary font-medium">No expiration</span></li>
                <li>
                  Scope: solo <span className="text-text-primary font-medium bg-surface2 px-1.5 py-0.5 rounded">gist</span>
                </li>
                <li>Click <span className="text-text-primary font-medium">Generate token</span> y copialo</li>
              </ol>
            </div>
          )}
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full px-4 py-3 pr-12 bg-surface2/40 rounded-2xl text-sm font-mono text-text-primary placeholder-muted border border-border/40 focus:border-accent/50 outline-none transition-all"
              disabled={isLoading}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-surface2 transition-colors"
              aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
            >
              {showToken ? (
                <EyeOff size={16} className="text-muted" />
              ) : (
                <Eye size={16} className="text-muted" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={!token.trim() || isLoading}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-body font-medium transition-all min-h-[48px]',
              'bg-accent text-white hover:bg-accent/85 shadow-lg shadow-accent/20',
              'disabled:opacity-40 disabled:pointer-events-none',
            )}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Conectando...
              </>
            ) : (
              'Conectar con GitHub'
            )}
          </button>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 animate-fade-in">
              <p className="text-sm font-body text-red-400">{error}</p>
            </div>
          )}
        </form>

        {/* Privacy note */}
        <p className="text-[11px] font-body text-muted/60 text-center leading-relaxed">
          Tu token se guarda solo en este dispositivo.
          <br />
          Nunca lo enviamos a ningún servidor.
        </p>
      </div>
    </div>
  );
}
