import { Calendar, Settings, Sparkles, Heart, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import type { AppTab } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const TABS: { tab: AppTab; label: string; icon: any }[] = [
  { tab: 'calendar', label: 'Calendario', icon: Calendar },
  { tab: 'assistant', label: 'NutriKal', icon: Sparkles }, // Repurposed para que cuadre
  { tab: 'historial', label: 'Favoritos', icon: Heart },
  { tab: 'settings', label: 'Ajustes', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="hidden md:flex flex-col w-72 h-dvh bg-[#f8faf1] border-r border-[#e7e9e0] fixed left-0 top-0 py-8 px-6 gap-8 z-40 no-print transition-all">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-[#226046] flex flex-shrink-0 items-center justify-center text-white shadow-lg overflow-hidden">
           <span className="font-heading font-extrabold text-2xl">NK</span>
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-[#191c17] leading-none">NutriKal</h1>
          <p className="text-[#5a6258] text-[10px] font-medium tracking-wide uppercase mt-1">NUTRICION PERSONALIZADA</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {TABS.map(({ tab, label, icon: Icon }) => {
          const active = activeTab === tab;
          return (
             <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={clsx(
                  'flex items-center gap-4 py-3 px-4 rounded-xl transition-all duration-300 group',
                  active 
                    ? 'text-[#191c17] font-bold border-r-4 border-[#226046] bg-[#edefe6]'
                    : 'text-[#5a6258] hover:text-[#226046] hover:translate-x-1 font-medium text-base'
                )}
                aria-label={label}
              >
                  <Icon size={20} className={active ? 'text-[#226046]' : 'text-inherit'} />
                  <span>{label}</span>
              </button>
          );
        })}
      </nav>

      <div className="space-y-2 pt-8 border-t border-[#e7e9e0]">
        <button onClick={logout} className="w-full flex items-center gap-4 py-2 px-4 text-[#5a6258] hover:text-red-500 transition-colors">
           <LogOut size={18} />
           <span className="text-sm font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
