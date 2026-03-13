import { Calendar, UtensilsCrossed, BookTemplate } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from '../../store/useCalendarStore';
import type { AppTab } from '../../types';

interface NavItem {
  tab: AppTab;
  label: string;
  icon: typeof Calendar;
}

const NAV_ITEMS: NavItem[] = [
  { tab: 'calendar', label: 'Calendario', icon: Calendar },
  { tab: 'recipes', label: 'Recetas', icon: UtensilsCrossed },
  { tab: 'templates', label: 'Plantillas', icon: BookTemplate },
];

export function BottomNav() {
  const activeTab = useCalendarStore((s) => s.activeTab);
  const setActiveTab = useCalendarStore((s) => s.setActiveTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface/80 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-xl transition-all duration-200 min-w-[64px] min-h-[48px]',
              activeTab === tab
                ? 'text-accent'
                : 'text-text-secondary hover:text-text-primary',
            )}
            aria-label={label}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={activeTab === tab ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
