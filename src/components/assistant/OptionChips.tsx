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
            className="bg-[#edefe6] text-[#226046] border border-[#bfcaba]/30 px-4 py-2 rounded-full text-xs font-medium hover:bg-[#e7e9e0] transition-colors flex items-center gap-2"
          >
            {Icon && <Icon size={14} strokeWidth={1.75} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
