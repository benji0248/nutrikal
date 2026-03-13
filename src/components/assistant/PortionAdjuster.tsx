import { Minus, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import type { EnergyLevel } from '../../types';

interface PortionAdjusterProps {
  servings: number;
  onServingsChange: (servings: number) => void;
  energyLevel: EnergyLevel;
  humanPortion: string;
}

/**
 * Stepper +/- with non-blocking color feedback.
 * Color hint based on energy level — never blocks the user.
 */
export function PortionAdjuster({ servings, onServingsChange, energyLevel, humanPortion }: PortionAdjusterProps) {
  const min = 0.5;
  const max = 4;
  const step = 0.5;

  const decrease = () => {
    if (servings > min) onServingsChange(Math.round((servings - step) * 10) / 10);
  };

  const increase = () => {
    if (servings < max) onServingsChange(Math.round((servings + step) * 10) / 10);
  };

  const ringColor = {
    green: 'ring-green/30',
    amber: 'ring-amber/30',
    warm_orange: 'ring-warm-orange/30',
  }[energyLevel];

  return (
    <div className={clsx('flex items-center gap-3 p-3 rounded-2xl ring-1 transition-all', ringColor, 'bg-surface2/20')}>
      <button
        type="button"
        onClick={decrease}
        disabled={servings <= min}
        className="w-9 h-9 rounded-xl bg-surface2 flex items-center justify-center text-text-primary hover:bg-surface2/80 disabled:opacity-30 transition-all"
      >
        <Minus size={16} />
      </button>

      <div className="flex-1 text-center">
        <p className="text-lg font-body font-bold text-text-primary">{servings}</p>
        <p className="text-[10px] font-body text-muted">
          {servings === 1 ? humanPortion : `${servings}x ${humanPortion}`}
        </p>
      </div>

      <button
        type="button"
        onClick={increase}
        disabled={servings >= max}
        className="w-9 h-9 rounded-xl bg-surface2 flex items-center justify-center text-text-primary hover:bg-surface2/80 disabled:opacity-30 transition-all"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
