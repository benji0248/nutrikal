import {
  Coffee,
  UtensilsCrossed,
  Moon,
  Cookie,
  CalendarDays,
  ChevronDown,
  ArrowLeft,
  Plus,
  Home,
  Check,
  UserCircle,
} from 'lucide-react';
import type { ChatOption } from '../../types';

interface OptionChipsProps {
  options: ChatOption[];
  onSelect: (option: ChatOption) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Coffee,
  UtensilsCrossed,
  Moon,
  Cookie,
  CalendarDays,
  ChevronDown,
  ArrowLeft,
  Plus,
  Home,
  Check,
  UserCircle,
};

export const OptionChips = ({ options, onSelect }: OptionChipsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const Icon = option.icon ? ICON_MAP[option.icon] : null;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option)}
            className="flex items-center gap-2 rounded-full border border-border/40 bg-surface2/30 px-4 py-2.5 min-h-[48px] text-sm font-body font-medium text-text-primary hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-all active:scale-95"
          >
            {Icon && <Icon size={16} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
