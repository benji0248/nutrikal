/**
 * Loading post-login — "The Living Journal" (DESIGN.md §2, §4, §5 "The Glow").
 * Tokens: surface, surface_container_low, primary, on_surface; sin bordes duros; sombra ambiental.
 */
const TOKENS = {
  surface: '#f8faf1',
  surfaceContainerLow: '#f3f5eb',
  primary: '#226046',
  onSurface: '#191c17',
  ambientShadow: '0px 20px 40px rgba(25, 28, 23, 0.06)',
} as const;

/** Anillo grueso, caps redondeados; verde primary (vitals). */
function JournalRingLoader() {
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = c * 0.22;
  return (
    <div
      className="h-20 w-20 animate-spin"
      style={{ animationDuration: '1.15s' }}
      aria-hidden
    >
      <svg width="100%" height="100%" viewBox="0 0 80 80" className="-rotate-90">
        <circle
          cx={40}
          cy={40}
          r={r}
          fill="none"
          stroke={TOKENS.surfaceContainerLow}
          strokeWidth={7}
          strokeLinecap="round"
        />
        <circle
          cx={40}
          cy={40}
          r={r}
          fill="none"
          stroke={TOKENS.primary}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-16 animate-fade-in"
      style={{ backgroundColor: TOKENS.surface }}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-14">
        <div
          className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#f3f5eb] to-[#ecefe6]"
          style={{ boxShadow: TOKENS.ambientShadow }}
        >
          <span
            className="font-sans text-[2.25rem] font-semibold leading-none tracking-tight"
            style={{ color: TOKENS.primary }}
          >
            N
          </span>
        </div>

        <JournalRingLoader />

        <p
          className="text-center font-sans text-[15px] font-medium leading-relaxed"
          style={{ color: TOKENS.onSurface, opacity: 0.78 }}
        >
          Verificando sesión...
        </p>
      </div>
    </div>
  );
}
