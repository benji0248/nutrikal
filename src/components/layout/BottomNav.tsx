import { Calendar, Settings, Sparkles, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import type { AppTab } from '../../types';

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const TABS: { tab: AppTab; label: string; icon: any }[] = [
  { tab: 'calendar', label: 'Calendario', icon: Calendar },
  { tab: 'assistant', label: 'NutriKal', icon: Sparkles },
  { tab: 'historial', label: 'Favoritos', icon: Heart },
  { tab: 'settings', label: 'Ajustes', icon: Settings },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pt-2 pb-6 md:hidden bg-[#f8faf1]/80 backdrop-blur-xl z-50 rounded-t-[2rem] shadow-[0px_-20px_40px_rgba(25,28,23,0.06)] safe-bottom no-print">
      {TABS.map(({ tab, label, icon: Icon }) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={clsx(
              'flex flex-col items-center justify-center px-4 py-2 active:scale-95 transition-all duration-200',
              active
                ? 'bg-[#226046] text-[#f8faf1] rounded-full'
                : 'text-[#191c17]/70 hover:bg-[#f3f5eb] rounded-full'
            )}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.5} />
            <span className="font-body font-medium text-[10px] uppercase tracking-wider mt-0.5">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
