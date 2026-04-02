import { Calendar, Settings, Sparkles, ShoppingCart, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { ThemeToggle } from '../ui/ThemeToggle';
import type { AppTab } from '../../types';

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const TABS: { tab: AppTab; label: string; icon: typeof Calendar }[] = [
  { tab: 'calendar', label: 'Calendario', icon: Calendar },
  { tab: 'assistant', label: 'Nutri', icon: Sparkles },
  { tab: 'historial', label: 'Historial', icon: Heart },
  { tab: 'shopping', label: 'Compras', icon: ShoppingCart },
  { tab: 'settings', label: 'Ajustes', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-60 h-dvh bg-surface border-r border-border fixed left-0 top-0 p-4 gap-1 no-print">
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center">
          <span className="text-accent font-heading font-bold text-lg">N</span>
        </div>
        <div>
          <h1 className="font-heading font-bold text-text-primary leading-tight">NutriKal</h1>
          <p className="text-muted text-[11px] font-body">Tu nutrición, organizada</p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1">
        {TABS.map(({ tab, label, icon: Icon }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left min-h-[48px] font-body text-sm',
                active
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted hover:text-text-primary hover:bg-surface2/50',
              )}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-border flex items-center justify-between px-3">
        <span className="text-xs text-muted font-body">Tema</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
