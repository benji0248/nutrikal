import type { Macros } from '../../types';
import { DAILY_REFERENCE, getMacroPercent } from '../../utils/macroHelpers';

interface MacroSummaryProps {
  totals: Macros;
}

interface RingProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  strokeColor: string;
}

function MacroRing({ value, max, label, unit, color, strokeColor }: RingProps) {
  const percent = getMacroPercent(value, max);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="5"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-sm font-mono font-medium ${color}`}>
            {unit === 'kcal' ? Math.round(value) : value.toFixed(1)}
          </span>
        </div>
      </div>
      <span className="text-[11px] font-body text-muted">{label}</span>
      <span className="text-[10px] font-mono text-muted">{percent}%</span>
    </div>
  );
}

export function MacroSummary({ totals }: MacroSummaryProps) {
  return (
    <div className="bg-surface2/50 rounded-3xl border border-border/50 p-5">
      <h3 className="text-sm font-heading font-bold text-text-primary mb-4">Resumen nutricional</h3>
      <div className="grid grid-cols-4 gap-2">
        <MacroRing
          value={totals.calories}
          max={DAILY_REFERENCE.calories}
          label="Calorías"
          unit="kcal"
          color="text-accent"
          strokeColor="#7c6aff"
        />
        <MacroRing
          value={totals.protein}
          max={DAILY_REFERENCE.protein}
          label="Proteína"
          unit="g"
          color="text-green"
          strokeColor="#34d399"
        />
        <MacroRing
          value={totals.carbs}
          max={DAILY_REFERENCE.carbs}
          label="Carbos"
          unit="g"
          color="text-amber"
          strokeColor="#fbbf24"
        />
        <MacroRing
          value={totals.fat}
          max={DAILY_REFERENCE.fat}
          label="Grasas"
          unit="g"
          color="text-pink"
          strokeColor="#ff6b9d"
        />
      </div>
    </div>
  );
}
