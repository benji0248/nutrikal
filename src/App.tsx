import { useEffect } from 'react';
import { CalendarDays, LayoutGrid } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from './store/useCalendarStore';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { WeekView } from './components/calendar/WeekView';
import { MonthView } from './components/calendar/MonthView';
import { RecipeBank } from './components/meals/RecipeBank';
import { TemplatesView } from './components/calendar/TemplatesView';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { todayISO } from './utils/dateHelpers';

function App() {
  const darkMode = useCalendarStore((s) => s.darkMode);
  const activeTab = useCalendarStore((s) => s.activeTab);
  const viewMode = useCalendarStore((s) => s.viewMode);
  const setViewMode = useCalendarStore((s) => s.setViewMode);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-dark text-text-primary transition-colors duration-300">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

      <Sidebar />

      <main className="md:ml-64 relative z-10">
        <header className="sticky top-0 z-30 bg-dark/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 md:hidden">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-display font-bold text-sm">N</span>
              </div>
              <h1 className="font-display font-bold text-text-primary">NutriKal</h1>
            </div>

            {activeTab === 'calendar' && (
              <div className="flex items-center gap-1 bg-surface-elevated rounded-xl p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-[40px]',
                    viewMode === 'week'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                  aria-label="Vista semanal"
                >
                  <CalendarDays size={14} />
                  <span className="hidden sm:inline">Semana</span>
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-[40px]',
                    viewMode === 'month'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                  aria-label="Vista mensual"
                >
                  <LayoutGrid size={14} />
                  <span className="hidden sm:inline">Mes</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              {activeTab === 'calendar' && (
                <button
                  onClick={() => setCurrentDate(todayISO())}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-accent hover:bg-accent/10 transition-colors min-h-[40px]"
                  aria-label="Ir a hoy"
                >
                  Hoy
                </button>
              )}
              <div className="md:hidden">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 pb-24 md:pb-6 max-w-3xl mx-auto">
          {activeTab === 'calendar' && viewMode === 'week' && <WeekView />}
          {activeTab === 'calendar' && viewMode === 'month' && <MonthView />}
          {activeTab === 'recipes' && <RecipeBank />}
          {activeTab === 'templates' && <TemplatesView />}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default App;
