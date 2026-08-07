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
  filledMealsCount: number;
  totalMealSlots: number;
}

export function DaySummaryCard({
  consumedKcal,
  budgetKcal,
  showCalories,
  filledMealsCount,
  totalMealSlots,
}: DaySummaryCardProps) {
  const quote = QUOTES[Math.abs(Math.floor(consumedKcal + budgetKcal)) % QUOTES.length];
  const remaining = Math.max(0, Math.round(budgetKcal - consumedKcal));
  const pct = getMacroPercent(consumedKcal, budgetKcal);
  const energyLevel: EnergyLevel = getEnergyLevel(consumedKcal, budgetKcal);
  const energyConfig = ENERGY_BAR[energyLevel];
  const energyRatio = budgetKcal > 0 ? Math.min(consumedKcal / budgetKcal, 1) : 0;
  const mealProgressPct = totalMealSlots > 0 ? Math.round((filledMealsCount / totalMealSlots) * 100) : 0;

  const mealProgressBlock = (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-extrabold tracking-tight">
          {filledMealsCount}
          <span className="text-lg font-semibold text-[#b1f0ce]/80"> / {totalMealSlots}</span>
        </span>
        <span className="font-body text-xs font-semibold uppercase tracking-wide text-[#b1f0ce]/90">
          comidas del día
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-[#b1f0ce] transition-all duration-500"
          style={{ width: `${mealProgressPct}%` }}
        />
      </div>
    </div>
  );

  const quoteBlock = (
    <p className="border-t border-white/10 pt-4 font-body text-sm italic leading-snug text-[#b1f0ce]/75">
      &ldquo;{quote}&rdquo;
    </p>
  );

  if (!showCalories) {
    return (
      <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-[#226046] p-6 text-white shadow-[0px_20px_40px_rgba(34,96,70,0.15)]">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#b1f0ce] opacity-20 transition-transform duration-700 group-hover:scale-110" />
        <div className="relative z-10 flex h-full flex-col gap-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#b1f0ce]">Resumen del día</p>

          {mealProgressBlock}

          <div className="space-y-2.5">
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

          {quoteBlock}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-[#226046] p-6 text-white shadow-[0px_20px_40px_rgba(34,96,70,0.15)]">
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#b1f0ce] opacity-20 transition-transform duration-700 group-hover:scale-110" />
      <div className="relative z-10 flex h-full flex-col gap-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#b1f0ce]">Resumen del día</p>

        {mealProgressBlock}

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="text-4xl font-extrabold tracking-tighter">{remaining.toLocaleString('es-AR')}</span>
              <span className="ml-1 text-sm font-medium text-[#b1f0ce]">kcal restantes</span>
            </div>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-[#b1f0ce]/30 border-t-[#b1f0ce]"
              style={{ transform: `rotate(${(pct / 100) * 360}deg)` }}
            >
              <span className="text-[11px] font-bold" style={{ transform: `rotate(-${(pct / 100) * 360}deg)` }}>
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

        {quoteBlock}
      </div>
    </div>
  );
}
