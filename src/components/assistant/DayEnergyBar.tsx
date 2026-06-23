
import type { EnergyLevel } from '../../types';


interface DayEnergyBarProps {
  level: EnergyLevel;
  ratio: number;
}

/**
 * Barra de energía solo por color (sin números al usuario en copy).
 */
export function DayEnergyBar({ ratio }: DayEnergyBarProps) {
  return (
    <div className="flex flex-col gap-2 p-3 bg-[#ffffff] rounded-2xl shadow-sm border border-[#e1e3da]/50">
      <div className="flex items-end justify-between">
        <span className="font-body text-[10px] font-bold uppercase tracking-widest text-[#707a6c]">
          Energía del Día
        </span>
        <span className="font-mono text-sm font-bold text-[#226046]">
          {Math.round(ratio * 100)}%
        </span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#f3f5eb]">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <rect
            x="0"
            y="0"
            width={ratio * 100}
            height="100"
            fill="#226046"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
      </div>
    </div>
  );
}
