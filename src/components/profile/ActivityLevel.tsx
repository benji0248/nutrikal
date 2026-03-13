import { clsx } from 'clsx';
import type { ActivityLevel as ActivityLevelType } from '../../types';
import { ACTIVITY_LEVEL_LABELS } from '../../types';

interface ActivityLevelProps {
  value: ActivityLevelType;
  onChange: (level: ActivityLevelType) => void;
}

const LEVELS: { level: ActivityLevelType; desc: string; emoji: string }[] = [
  { level: 'sedentary', desc: 'Trabajo de escritorio, poco movimiento', emoji: '🪑' },
  { level: 'light', desc: 'Caminata leve, 1-2 días ejercicio', emoji: '🚶' },
  { level: 'moderate', desc: 'Ejercicio 3-5 días/semana', emoji: '🏃' },
  { level: 'active', desc: 'Ejercicio intenso 6-7 días', emoji: '💪' },
  { level: 'very_active', desc: 'Atleta o trabajo físico pesado', emoji: '🏋️' },
];

export function ActivityLevelSelector({ value, onChange }: ActivityLevelProps) {
  return (
    <div className="space-y-2">
      {LEVELS.map(({ level, desc, emoji }) => {
        const active = value === level;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={clsx(
              'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left',
              active
                ? 'border-accent bg-accent/10 ring-1 ring-accent/40'
                : 'border-border bg-surface2/30 hover:bg-surface2/60',
            )}
          >
            <span className="text-xl">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={clsx('text-sm font-body font-medium', active ? 'text-accent' : 'text-text-primary')}>
                {ACTIVITY_LEVEL_LABELS[level]}
              </p>
              <p className="text-xs font-body text-muted truncate">{desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
