import { getMacroPercent } from '../../utils/macroHelpers';

const QUOTES = [
  'Nutrí tu cuerpo con intención, no con prisa.',
  'Cada comida es una oportunidad de cuidarte.',
  'La constancia vale más que la perfección.',
  'Tu energía empieza en el plato.',
];

interface DaySummaryCardProps {
  consumedKcal: number;
  budgetKcal: number;
  showCalories: boolean;
}

export function DaySummaryCard({ consumedKcal, budgetKcal, showCalories }: DaySummaryCardProps) {
  const quote = QUOTES[Math.abs(Math.floor(consumedKcal + budgetKcal)) % QUOTES.length];
  const remaining = Math.max(0, Math.round(budgetKcal - consumedKcal));
  const pct = getMacroPercent(consumedKcal, budgetKcal);
  const radius = 44;
  const c = 2 * Math.PI * radius;
  const dash = (pct / 100) * c;

  if (!showCalories) {
    return (
      <div
        className="rounded-[2rem] p-6 text-[#f8faf6] shadow-ambient"
        style={{ background: 'linear-gradient(145deg, #226046 0%, #1a4a36 100%)' }}
      >
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase opacity-90">Resumen del día</p>
        <p className="mt-4 font-body text-sm leading-relaxed italic opacity-95">&ldquo;{quote}&rdquo;</p>
        <p className="mt-4 text-xs opacity-75">Activá &ldquo;Mostrar calorías&rdquo; en ajustes para ver tu energía.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[2rem] p-6 text-[#f8faf6] shadow-ambient flex flex-col min-h-[280px]"
      style={{ background: 'linear-gradient(145deg, #226046 0%, #1a4a36 100%)' }}
    >
      <p className="text-[10px] font-semibold tracking-[0.2em] uppercase opacity-90">Resumen del día</p>
      <p className="mt-3 font-body text-base leading-snug italic opacity-95 flex-1">&ldquo;{quote}&rdquo;</p>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-heading font-bold tabular-nums">{remaining.toLocaleString('es-AR')}</p>
          <p className="text-xs opacity-85 mt-1">kcal disponibles</p>
        </div>
        <div className="relative h-24 w-24 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(248,250,241,0.15)" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#f8faf6"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-heading font-bold tabular-nums">{pct}%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 rounded-full bg-white/15 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#f8faf6]/90 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] opacity-75 mt-2">
        {Math.round(consumedKcal)} / {Math.round(budgetKcal)} kcal registradas
      </p>
    </div>
  );
}
