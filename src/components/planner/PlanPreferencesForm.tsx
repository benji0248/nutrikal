import { clsx } from 'clsx';
import type { PlanPreferences } from '../../types';

interface PlanPreferencesFormProps {
  preferences: PlanPreferences;
  onChange: (prefs: PlanPreferences) => void;
}

interface OptionDef<T extends string> {
  value: T;
  label: string;
}

const VARIETY_OPTIONS: OptionDef<PlanPreferences['variety']>[] = [
  { value: 'poca', label: 'Poca' },
  { value: 'normal', label: 'Normal' },
  { value: 'mucha', label: 'Mucha' },
];

const TIME_OPTIONS: OptionDef<PlanPreferences['cookingTime']>[] = [
  { value: 'rapido', label: 'Rápido' },
  { value: 'normal', label: 'Normal' },
  { value: 'elaborado', label: 'Elaborado' },
];

const BUDGET_OPTIONS: OptionDef<PlanPreferences['budget']>[] = [
  { value: 'economico', label: 'Económico' },
  { value: 'normal', label: 'Normal' },
  { value: 'premium', label: 'Premium' },
];

export const PlanPreferencesForm = ({ preferences, onChange }: PlanPreferencesFormProps) => {
  return (
    <div className="space-y-4">
      <SelectorRow
        label="Variedad"
        options={VARIETY_OPTIONS}
        value={preferences.variety}
        onSelect={(v) => onChange({ ...preferences, variety: v })}
      />
      <SelectorRow
        label="Tiempo de cocina"
        options={TIME_OPTIONS}
        value={preferences.cookingTime}
        onSelect={(v) => onChange({ ...preferences, cookingTime: v })}
      />
      <SelectorRow
        label="Presupuesto"
        options={BUDGET_OPTIONS}
        value={preferences.budget}
        onSelect={(v) => onChange({ ...preferences, budget: v })}
      />
    </div>
  );
};

interface SelectorRowProps<T extends string> {
  label: string;
  options: OptionDef<T>[];
  value: T;
  onSelect: (v: T) => void;
}

function SelectorRow<T extends string>({ label, options, value, onSelect }: SelectorRowProps<T>) {
  return (
    <div>
      <span className="text-xs font-body text-muted mb-1.5 block">{label}</span>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={clsx(
              'flex-1 px-3 py-2.5 rounded-xl text-xs font-body font-medium transition-all min-h-[44px]',
              value === opt.value
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-surface2/40 text-muted border border-transparent',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
