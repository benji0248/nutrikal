import { Calendar, UtensilsCrossed, BookTemplate } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from '../../store/useCalendarStore';
import { ThemeToggle } from '../ui/ThemeToggle';
import type { AppTab } from '../../types';

interface SidebarItem {
  tab: AppTab;
  label: string;
  icon: typeof Calendar;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { tab: 'calendar', label: 'Calendario', icon: Calendar },
  { tab: 'recipes', label: 'Recetas', icon: UtensilsCrossed },
  { tab: 'templates', label: 'Plantillas', icon: BookTemplate },
];

export function Sidebar() {
  const activeTab = useCalendarStore((s) => s.activeTab);
  const setActiveTab = useCalendarStore((s) => s.setActiveTab);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-surface border-r border-border p-4 gap-2 fixed left-0 top-0">
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <span className="text-accent font-display font-bold text-lg">N</span>
        </div>
        <div>
          <h1 className="font-display font-bold text-text-primary text-lg leading-tight">NutriKal</h1>
          <p className="text-text-secondary text-xs">Tu calendario nutricional</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {SIDEBAR_ITEMS.map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left min-h-[48px]',
              activeTab === tab
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50',
            )}
            aria-label={label}
            aria-current={activeTab === tab ? 'page' : undefined}
          >
            <Icon size={20} />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between px-3">
          <span className="text-xs text-text-secondary">Tema</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
