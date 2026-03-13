import { clsx } from 'clsx';
import type { EnergyLevel } from '../../types';

interface DayEnergyBarProps {
  level: EnergyLevel;
  ratio: number; // 0–1
}

const LEVEL_COLORS: Record<EnergyLevel, { bg: string; fill: string; label: string }> = {
  green: { bg: 'bg-green/10', fill: 'bg-green', label: 'Tenés margen' },
  amber: { bg: 'bg-amber/10', fill: 'bg-amber', label: 'Vas bien' },
  warm_orange: { bg: 'bg-warm-orange/10', fill: 'bg-warm-orange', label: 'Casi al tope' },
};

/**
 * Color-only energy bar. NEVER shows numbers or calories.
 * Green → Amber → Warm Orange. NEVER red.
 */
export function DayEnergyBar({ level, ratio }: DayEnergyBarProps) {
  const { bg, fill, label } = LEVEL_COLORS[level];
  const width = Math.min(ratio * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-body font-medium text-text-primary">Tu día</p>
        <p className={clsx('text-xs font-body font-medium', {
          'text-green': level === 'green',
          'text-amber': level === 'amber',
          'text-warm-orange': level === 'warm_orange',
        })}>
          {label}
        </p>
      </div>
      <div className={clsx('w-full h-2.5 rounded-full overflow-hidden', bg)}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500 ease-out', fill)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
