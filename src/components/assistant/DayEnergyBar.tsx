import type { EnergyLevel } from '../../types';
import { ENERGY_BAR } from './journalTokens';

interface DayEnergyBarProps {
  level: EnergyLevel;
  ratio: number;
  showCalories?: boolean;
}

/**
 * Barra de energía del día: color cualitativo (verde / ámbar / naranja).
 * Números solo en Modo Pro (`showCalories`).
 */
export function DayEnergyBar({ level, ratio, showCalories = false }: DayEnergyBarProps) {
  const config = ENERGY_BAR[level];
  const clampedRatio = Math.min(Math.max(ratio, 0), 1);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#e1e3da]/50 bg-[#ffffff] p-3 shadow-sm">
      <div className="flex items-end justify-between gap-2">
        <span className="font-body text-[10px] font-bold uppercase tracking-widest text-[#707a6c]">
          Energía del día
        </span>
        {showCalories ? (
          <span className="font-mono text-sm font-bold text-[#226046]">
            {Math.round(clampedRatio * 100)}%
          </span>
        ) : (
          <span
            className="font-body text-xs font-semibold"
            style={{ color: config.fill }}
          >
            {config.label}
          </span>
        )}
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#f3f5eb]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${clampedRatio * 100}%`, backgroundColor: config.fill }}
        />
      </div>

      {!showCalories && (
        <p className="font-body text-[11px] text-[#707a6c]">{config.hint}</p>
      )}
    </div>
  );
}
