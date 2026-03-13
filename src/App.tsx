import { useState } from 'react';
import { Sun, CalendarDays, LayoutGrid, Download, Printer } from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from './hooks/useTheme';
import { useCalendarStore } from './store/useCalendarStore';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { WeekView } from './components/calendar/WeekView';
import { MonthView } from './components/calendar/MonthView';
import { DayView } from './components/calendar/DayView';
import { CalorieCalculator } from './components/calculator/CalorieCalculator';
import { RecipeBank } from './components/meals/RecipeBank';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { Button } from './components/ui/Button';
import { BottomSheet } from './components/ui/BottomSheet';
import { Modal } from './components/ui/Modal';
import { getWeekRange, getMonthLabel } from './utils/dateHelpers';
import type { AppTab } from './types';

function App() {
  useTheme();
  const [activeTab, setActiveTab] = useState<AppTab>('calendar');
  const view = useCalendarStore((s) => s.view);
  const setView = useCalendarStore((s) => s.setView);
  const goToToday = useCalendarStore((s) => s.goToToday);
  const currentDate = useCalendarStore((s) => s.currentDate);
  const weekTemplates = useCalendarStore((s) => s.weekTemplates);
  const applyTemplate = useCalendarStore((s) => s.applyTemplate);
  const deleteTemplate = useCalendarStore((s) => s.deleteTemplate);

  const [showTemplates, setShowTemplates] = useState(false);

  const headerLabel = view === 'day' ? '' : view === 'week' ? getWeekRange(currentDate) : getMonthLabel(currentDate);

  const handleExportJSON = () => {
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('nutrikal')) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutrikal-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const templatesContent = (
    <div className="space-y-3">
      {weekTemplates.length === 0 ? (
        <p className="text-sm text-muted font-body text-center py-4">No hay plantillas guardadas</p>
      ) : (
        weekTemplates.map((tpl) => (
          <div key={tpl.id} className="bg-surface2/50 rounded-2xl border border-border/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-body font-medium text-text-primary">{tpl.name}</h3>
              <span className="text-[10px] text-muted font-mono">
                {new Date(tpl.createdAt).toLocaleDateString('es-AR')}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={() => { applyTemplate(tpl.id, currentDate, 'merge'); setShowTemplates(false); }}>
                Combinar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { applyTemplate(tpl.id, currentDate, 'replace'); setShowTemplates(false); }}>
                Reemplazar
              </Button>
              <Button size="sm" variant="danger" onClick={() => deleteTemplate(tpl.id)}>
                Eliminar
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg text-text-primary">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="md:ml-60 relative z-10">
        <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl border-b border-border/40 no-print">
          <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 md:hidden">
              <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-heading font-bold text-sm">N</span>
              </div>
              <h1 className="font-heading font-bold text-text-primary text-sm">NutriKal</h1>
            </div>

            {activeTab === 'calendar' && (
              <div className="hidden md:block">
                <span className="text-sm font-heading font-bold text-text-primary capitalize">
                  {headerLabel}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {activeTab === 'calendar' && (
                <>
                  <div className="flex items-center gap-0.5 bg-surface2 rounded-xl p-0.5">
                    <button
                      onClick={() => setView('day')}
                      className={clsx(
                        'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-body font-medium transition-all min-h-[36px]',
                        view === 'day' ? 'bg-accent text-white' : 'text-muted hover:text-text-primary',
                      )}
                      aria-label="Vista diaria"
                    >
                      <Sun size={14} />
                      <span className="hidden sm:inline">Día</span>
                    </button>
                    <button
                      onClick={() => setView('week')}
                      className={clsx(
                        'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-body font-medium transition-all min-h-[36px]',
                        view === 'week' ? 'bg-accent text-white' : 'text-muted hover:text-text-primary',
                      )}
                      aria-label="Vista semanal"
                    >
                      <CalendarDays size={14} />
                      <span className="hidden sm:inline">Semana</span>
                    </button>
                    <button
                      onClick={() => setView('month')}
                      className={clsx(
                        'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-body font-medium transition-all min-h-[36px]',
                        view === 'month' ? 'bg-accent text-white' : 'text-muted hover:text-text-primary',
                      )}
                      aria-label="Vista mensual"
                    >
                      <LayoutGrid size={14} />
                      <span className="hidden sm:inline">Mes</span>
                    </button>
                  </div>
                  <button
                    onClick={goToToday}
                    className="px-3 py-2 rounded-xl text-xs font-body font-medium text-accent hover:bg-accent/10 transition-colors min-h-[36px]"
                    aria-label="Ir a hoy"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="px-2 py-2 rounded-xl text-xs font-body text-muted hover:text-text-primary hover:bg-surface2 transition-colors min-h-[36px]"
                    aria-label="Plantillas"
                  >
                    ⋯
                  </button>
                </>
              )}
              <div className="md:hidden">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-6 pb-24 md:pb-6 max-w-4xl mx-auto">
          {activeTab === 'calendar' && view === 'day' && <DayView />}
          {activeTab === 'calendar' && view === 'week' && <WeekView />}
          {activeTab === 'calendar' && view === 'month' && <MonthView />}
          {activeTab === 'calculator' && <CalorieCalculator />}
          {activeTab === 'recipes' && (
            <RecipeBank onNavigateToCalculator={() => setActiveTab('calculator')} />
          )}
          {activeTab === 'settings' && (
            <SettingsView onExportJSON={handleExportJSON} />
          )}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <BottomSheet isOpen={showTemplates} onClose={() => setShowTemplates(false)} title="Plantillas de semana">
        {templatesContent}
      </BottomSheet>
      <Modal isOpen={showTemplates} onClose={() => setShowTemplates(false)} title="Plantillas de semana">
        {templatesContent}
      </Modal>
    </div>
  );
}

function SettingsView({ onExportJSON }: { onExportJSON: () => void }) {
  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-heading font-bold text-text-primary">Ajustes</h2>

      <div className="bg-surface2/40 rounded-3xl border border-border/40 p-5 space-y-4">
        <h3 className="text-sm font-heading font-bold text-text-primary">Apariencia</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-body text-muted">Tema</span>
          <ThemeToggle />
        </div>
      </div>

      <div className="bg-surface2/40 rounded-3xl border border-border/40 p-5 space-y-4">
        <h3 className="text-sm font-heading font-bold text-text-primary">Datos</h3>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" icon={<Download size={16} />} onClick={onExportJSON} fullWidth>
            Exportar datos (JSON)
          </Button>
          <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()} fullWidth>
            Imprimir semana actual
          </Button>
        </div>
      </div>

      <div className="text-center pt-4">
        <p className="text-xs text-muted font-body">NutriKal v1.0</p>
        <p className="text-[10px] text-muted/60 font-body mt-1">
          Todos los datos se guardan localmente en tu navegador
        </p>
      </div>
    </div>
  );
}

export default App;
