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
import type { LucideIcon } from 'lucide-react';
import type { ChatOption } from '../../types';
import { JOURNAL } from './journalTokens';

interface OptionChipsProps {
  options: ChatOption[];
  onSelect: (option: ChatOption) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
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
            className="flex min-h-[48px] items-center gap-2 rounded-full px-4 py-2.5 font-body text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              backgroundColor: JOURNAL.chipBg,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: JOURNAL.chipBorder,
              color: JOURNAL.primary,
            }}
          >
            {Icon && <Icon size={16} strokeWidth={1.75} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
