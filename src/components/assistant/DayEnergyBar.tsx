import { clsx } from 'clsx';
import type { EnergyLevel } from '../../types';
import { JOURNAL } from './journalTokens';

interface DayEnergyBarProps {
  level: EnergyLevel;
  ratio: number;
}

/** Colores alineados al journal (superficie clara); sin rojo. */
const LEVEL: Record<EnergyLevel, { track: string; fill: string; label: string }> = {
  green: {
    track: 'rgba(34, 96, 70, 0.12)',
    fill: JOURNAL.primary,
    label: 'Tenés margen',
  },
  amber: {
    track: 'rgba(137, 81, 0, 0.15)',
    fill: '#b45309',
    label: 'Vas bien',
  },
  warm_orange: {
    track: 'rgba(180, 83, 9, 0.18)',
    fill: '#c2410c',
    label: 'Casi al tope',
  },
};

/**
 * Barra de energía solo por color (sin números al usuario en copy).
 */
export function DayEnergyBar({ level, ratio }: DayEnergyBarProps) {
  const { track, fill, label } = LEVEL[level];
  const width = Math.min(ratio * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="font-body text-xs font-medium" style={{ color: JOURNAL.onSurface }}>
          Tu día
        </p>
        <p className="font-body text-xs font-medium" style={{ color: fill }}>
          {label}
        </p>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: track }}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500 ease-out')}
          style={{ width: `${width}%`, backgroundColor: fill }}
        />
      </div>
    </div>
  );
}
