/** Paleta pantallas de auth (mock “living journal”) — independiente del tema global. */
export const AUTH_THEME = {
  cream: '#F5F5ED',
  forest: '#2D5A43',
  muted: '#5c5c56',
  line: 'rgba(45, 90, 67, 0.12)',
  ink: '#1a1a18',
} as const;

export const authInputClass =
  'w-full px-4 py-3.5 rounded-full text-sm font-body bg-white border border-black/[0.06] text-[#1a1a18] placeholder:text-neutral-400/90 outline-none transition-shadow focus:ring-2 focus:ring-[#2D5A43]/25 focus:border-[#2D5A43]/35';
