import { getMacroPercent } from '../../utils/macroHelpers';
import { getEnergyLevel } from '../../services/metabolicService';
import type { EnergyLevel } from '../../types';
import { ENERGY_BAR } from '../assistant/journalTokens';

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
  const energyLevel: EnergyLevel = getEnergyLevel(consumedKcal, budgetKcal);
  const energyConfig = ENERGY_BAR[energyLevel];
  const energyRatio = budgetKcal > 0 ? Math.min(consumedKcal / budgetKcal, 1) : 0;

  if (!showCalories) {
    return (
      <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-[#226046] p-8 text-white shadow-[0px_20px_40px_rgba(34,96,70,0.15)] group">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#b1f0ce] opacity-20 transition-transform duration-700 group-hover:scale-110" />
        <div className="relative z-10 flex h-full flex-col">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#b1f0ce]">
            Resumen del día
          </p>
          <h3 className="mb-6 text-3xl font-bold italic leading-tight">&ldquo;{quote}&rdquo;</h3>

          <div className="mt-auto space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-xs font-semibold uppercase tracking-wide text-[#b1f0ce]/90">
                Energía del día
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 font-body text-xs font-semibold"
                style={{ backgroundColor: `${energyConfig.fill}33`, color: '#f8faf6' }}
              >
                {energyConfig.label}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${energyRatio * 100}%`, backgroundColor: energyConfig.fill }}
              />
            </div>
            <p className="font-body text-xs text-[#b1f0ce]/80">{energyConfig.hint}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-[#226046] p-8 text-white shadow-[0px_20px_40px_rgba(34,96,70,0.15)] group">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#b1f0ce] opacity-20 transition-transform duration-700 group-hover:scale-110" />
      <div className="relative z-10 flex h-full flex-col">
        <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#b1f0ce]">Resumen del Día</p>
        <h3 className="mb-8 text-3xl font-bold italic leading-tight">&ldquo;{quote}&rdquo;</h3>
        <div className="mt-auto space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-5xl font-extrabold tracking-tighter">{remaining.toLocaleString('es-AR')}</span>
              <span className="ml-1 font-medium text-[#b1f0ce]">kcal restantes</span>
            </div>
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-[#b1f0ce]/30 border-t-[#b1f0ce]"
              style={{ transform: `rotate(${(pct / 100) * 360}deg)` }}
            >
              <span className="text-xs font-bold" style={{ transform: `rotate(-${(pct / 100) * 360}deg)` }}>
                {pct}%
              </span>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#b1f0ce] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
