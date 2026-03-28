import { Calendar, BookOpen, Settings, Sparkles, ShoppingCart } from 'lucide-react';
import { clsx } from 'clsx';
import type { AppTab } from '../../types';

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const TABS: { tab: AppTab; label: string; icon: typeof Calendar }[] = [
  { tab: 'calendar', label: 'Calendario', icon: Calendar },
  { tab: 'assistant', label: 'Nutri', icon: Sparkles },
  { tab: 'recipes', label: 'Recetas', icon: BookOpen },
  { tab: 'shopping', label: 'Compras', icon: ShoppingCart },
  { tab: 'settings', label: 'Ajustes', icon: Settings },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface/85 backdrop-blur-xl border-t border-border safe-bottom no-print">
      <div className="flex items-center justify-around px-0.5 py-1.5">
        {TABS.map(({ tab, label, icon: Icon }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 py-1.5 px-1.5 rounded-2xl transition-all min-w-0 min-h-[44px]',
                active ? 'text-accent' : 'text-muted',
              )}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[9px] font-body font-medium leading-tight truncate max-w-[52px]">{label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-accent" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
