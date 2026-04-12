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


interface OptionChipsProps {
  options: ChatOption[];
  onSelect: (option: ChatOption) => void;
  disabled?: boolean;
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

export const OptionChips = ({ options, onSelect, disabled = false }: OptionChipsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const Icon = option.icon ? ICON_MAP[option.icon] : null;

        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option)}
            className="min-h-[48px] bg-[#edefe6] text-[#226046] border border-[#bfcaba]/30 px-4 py-2 rounded-full text-xs font-medium hover:bg-[#e7e9e0] transition-colors flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
          >
            {Icon && <Icon size={14} strokeWidth={1.75} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
