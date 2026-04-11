import { clsx } from 'clsx';
import type { ActivityLevel as ActivityLevelType } from '../../types';
import { ACTIVITY_LEVEL_LABELS } from '../../types';

interface ActivityLevelProps {
  value: ActivityLevelType;
  onChange: (level: ActivityLevelType) => void;
  tone?: 'default' | 'journal';
}

const LEVELS: { level: ActivityLevelType; desc: string; emoji: string }[] = [
  { level: 'sedentary', desc: 'Trabajo de escritorio, poco movimiento', emoji: '🪑' },
  { level: 'light', desc: 'Caminata leve, 1-2 días ejercicio', emoji: '🚶' },
  { level: 'moderate', desc: 'Ejercicio 3-5 días/semana', emoji: '🏃' },
  { level: 'active', desc: 'Ejercicio intenso 6-7 días', emoji: '💪' },
  { level: 'very_active', desc: 'Atleta o trabajo físico pesado', emoji: '🏋️' },
];

export function ActivityLevelSelector({ value, onChange, tone = 'default' }: ActivityLevelProps) {
  const journal = tone === 'journal';

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
              'w-full flex items-center gap-3 p-4 transition-all text-left rounded-[2rem]',
              journal
                ? active
                  ? 'bg-white ring-2 ring-[#226046] shadow-[0px_12px_32px_rgba(34,96,70,0.12)]'
                  : 'bg-white shadow-[0px_8px_24px_rgba(25,28,23,0.06)] hover:shadow-[0px_12px_28px_rgba(25,28,23,0.08)]'
                : active
                  ? 'border border-accent bg-accent/10 ring-1 ring-accent/40'
                  : 'border border-border bg-surface2/30 hover:bg-surface2/60',
            )}
          >
            <span className="text-xl">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p
                className={clsx(
                  'text-sm font-body font-medium',
                  journal
                    ? active
                      ? 'text-[#226046]'
                      : 'text-[#191c17]'
                    : active
                      ? 'text-accent'
                      : 'text-text-primary',
                )}
              >
                {ACTIVITY_LEVEL_LABELS[level]}
              </p>
              <p className={clsx('text-xs font-body truncate', journal ? 'text-[#5a6258]' : 'text-muted')}>
                {desc}
              </p>
            </div>
            {journal && active && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#226046] text-[10px] text-[#f8faf6]">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
