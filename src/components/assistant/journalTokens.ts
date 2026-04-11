/**
 * Tokens visuales Nutri / “Living Journal” (DESIGN.md + guía de producto).
 * Tokens compartidos con el tema global (DESIGN.md); Nutri/planner/perfil los reutilizan.
 */
export const JOURNAL = {
  surface: '#f8faf1',
  surfaceLow: '#f3f5eb',
  surfaceElevated: '#ffffff',
  primary: '#226046',
  onPrimary: '#f8faf6',
  onSurface: '#191c17',
  muted: '#5a6258',
  /** Sombra ambiental DESIGN.md §4 */
  ambientShadow: '0px 20px 40px rgba(25, 28, 23, 0.06)',
  /** Glass suave cabecera / input flotante */
  glass: 'rgba(248, 250, 241, 0.92)',
  chipBg: 'rgba(34, 96, 70, 0.08)',
  chipBorder: 'rgba(34, 96, 70, 0.22)',
  /** DESIGN.md — acento cítrico / energía */
  secondary: '#895100',
} as const;
