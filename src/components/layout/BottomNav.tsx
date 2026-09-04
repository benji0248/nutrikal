import { Calendar, Settings, Sparkles, Heart, FlaskConical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import type { AppTab } from '../../types';

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const TABS: { tab: AppTab; label: string; icon: LucideIcon }[] = [
  { tab: 'assistant', label: 'Inicio', icon: Sparkles },
  { tab: 'calendar', label: 'Calendario', icon: Calendar },
  { tab: 'estudios', label: 'Estudios', icon: FlaskConical },
  { tab: 'historial', label: 'Favoritos', icon: Heart },
  { tab: 'settings', label: 'Ajustes', icon: Settings },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 w-full md:hidden z-50 no-print bg-[#f8faf1]/80 backdrop-blur-xl rounded-t-[2rem] shadow-[0px_-20px_40px_rgba(25,28,23,0.06)] safe-bottom-nav"
      aria-label="Navegación principal"
    >
      <div className="flex items-stretch justify-between gap-0.5 px-1.5 pt-1.5 pb-1 max-w-lg mx-auto w-full min-w-0">
        {TABS.map(({ tab, label, icon: Icon }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={clsx(
                'flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 min-h-[48px] px-0.5 py-1.5 rounded-2xl transition-all duration-200 active:scale-95',
                active ? 'text-[#226046]' : 'text-[#191c17]/55 hover:text-[#226046]/80',
              )}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={clsx(
                  'flex items-center justify-center w-10 h-8 rounded-full transition-colors duration-200',
                  active ? 'bg-[#226046] text-[#f8faf1]' : 'bg-transparent',
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.5} aria-hidden />
              </span>
              <span
                className={clsx(
                  'font-body text-[9px] min-[360px]:text-[10px] leading-tight tracking-wide text-center px-0.5 whitespace-nowrap',
                  active ? 'font-semibold' : 'font-medium',
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
