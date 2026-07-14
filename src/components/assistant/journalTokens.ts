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
  /** Barra de energía del día — nunca rojo (SP-1) */
  energyGreen: '#226046',
  energyAmber: '#c48400',
  energyOrange: '#d97706',
} as const;

/** Colores y copy cualitativo para energía del día (Modo Simple). */
export const ENERGY_BAR = {
  green: {
    fill: JOURNAL.energyGreen,
    label: 'Con margen',
    hint: 'Todavía tenés espacio en el día.',
  },
  amber: {
    fill: JOURNAL.energyAmber,
    label: 'Equilibrado',
    hint: 'Vas bien encaminado hoy.',
  },
  warm_orange: {
    fill: JOURNAL.energyOrange,
    label: 'Día contundente',
    hint: 'Cerca de tu ritmo diario — sin drama.',
  },
} as const;

/** Badge de peso del plato vs slot (Modo Simple). */
export const MEAL_WEIGHT_BADGE = {
  liviano: { bg: 'rgba(34, 96, 70, 0.12)', text: '#226046', label: 'Liviano' },
  balanceado: { bg: 'rgba(200, 132, 0, 0.12)', text: '#895100', label: 'Balanceado' },
  contundente: { bg: 'rgba(217, 119, 6, 0.12)', text: '#663b00', label: 'Contundente' },
} as const;
