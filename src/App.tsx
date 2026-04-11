import { useState, useEffect } from 'react';
import { Sun, CalendarDays, LayoutGrid, Download, Printer, UserCircle, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from './hooks/useTheme';
import { useAuthStore } from './store/useAuthStore';
import { useGistSyncStore } from './store/useGistSyncStore';
import { useCalendarStore } from './store/useCalendarStore';
import { useProfileStore } from './store/useProfileStore';
import { useSettingsStore } from './store/useSettingsStore';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { WeekView } from './components/calendar/WeekView';
import { MonthView } from './components/calendar/MonthView';
import { DayView } from './components/calendar/DayView';
import { HistorialView } from './components/historial/HistorialView';
import { ChatAssistant } from './components/assistant/ChatAssistant';
import { ShoppingListView } from './components/shopping/ShoppingList';
import { ProfileSetup } from './components/profile/ProfileSetup';
import { ProfileRecalibrate } from './components/profile/ProfileRecalibrate';
import { SyncIndicator } from './components/ui/SyncIndicator';
import { Button } from './components/ui/Button';
import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { LoadingScreen } from './components/auth/LoadingScreen';
import { UserMenu } from './components/auth/UserMenu';
import { getWeekRange, getMonthLabel } from './utils/dateHelpers';
import type { AppTab } from './types';

function App() {
  useTheme();
  const authState = useAuthStore((s) => s.authState);
  const authView = useAuthStore((s) => s.authView);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authState === 'authenticating') {
    return <LoadingScreen />;
  }

  if (authState !== 'authenticated') {
    return authView === 'register' ? <RegisterScreen /> : <LoginScreen />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const profile = useProfileStore((s) => s.profile);
  const needsRecalibration = useProfileStore((s) => s.needsRecalibration);

  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('calendar');
  const view = useCalendarStore((s) => s.view);
  const setView = useCalendarStore((s) => s.setView);
  const goToToday = useCalendarStore((s) => s.goToToday);
  const currentDate = useCalendarStore((s) => s.currentDate);
  const initialLoad = useGistSyncStore((s) => s.initialLoad);

  const [showRecalibrate, setShowRecalibrate] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  // Sync data from server on mount, then decide initial tab
  useEffect(() => {
    initialLoad().then(() => {
      setTimeout(() => {
        const p = useProfileStore.getState().profile;
        if (!p) {
          setShowProfileEdit(true);
        }
        setReady(true);
      }, 100);
    }).catch(() => {
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check recalibration on mount
  useEffect(() => {
    if (profile && needsRecalibration()) {
      setShowRecalibrate(true);
    }
  }, [profile, needsRecalibration]);

  const headerLabel = view === 'day' ? '' : view === 'week' ? getWeekRange(currentDate) : getMonthLabel(currentDate);

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-dvh bg-bg text-text-primary">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="md:ml-72 relative z-10 min-h-screen">
        <header className="sticky top-0 z-30 bg-surface/75 backdrop-blur-xl border-b border-border/30 no-print">
          <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
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
                </>
              )}
              <SyncIndicator />
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="px-4 md:px-12 py-6 pb-24 md:pb-12 max-w-7xl mx-auto">
          {activeTab === 'calendar' && view === 'day' && <DayView onNavigateToAssistant={() => setActiveTab('assistant')} />}
          {activeTab === 'calendar' && view === 'week' && <WeekView onNavigateToAssistant={() => setActiveTab('assistant')} />}
          {activeTab === 'calendar' && view === 'month' && <MonthView />}
          {activeTab === 'assistant' && <ChatAssistant onTabChange={setActiveTab} />}
          {activeTab === 'historial' && <HistorialView />}
          {activeTab === 'shopping' && <ShoppingListView />}
          {activeTab === 'settings' && <SettingsView onEditProfile={() => setShowProfileEdit(true)} />}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <ProfileRecalibrate
        isOpen={showRecalibrate}
        onClose={() => setShowRecalibrate(false)}
        onEditProfile={() => { setShowRecalibrate(false); setShowProfileEdit(true); }}
      />
      <ProfileSetup
        isOpen={showProfileEdit}
        onClose={() => {
          setShowProfileEdit(false);
          // After closing profile setup, if profile now exists, go to assistant
          const p = useProfileStore.getState().profile;
          if (p) setActiveTab('assistant');
        }}
        existingProfile={profile}
      />
    </div>
  );
}

function CaloriesToggle() {
  const showCalories = useSettingsStore((s) => s.showCalories);
  const setShowCalories = useSettingsStore((s) => s.setShowCalories);

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0 mr-3">
        <span className="text-sm font-body text-muted block">Mostrar calorías</span>
        <span className="text-[11px] font-body text-muted/60">
          Ver las calorías de cada comida y el total del día
        </span>
      </div>
      <button
        role="switch"
        aria-checked={showCalories}
        onClick={() => setShowCalories(!showCalories)}
        className="relative shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center"
      >
        <span
          className={clsx(
            'block h-7 w-12 rounded-full transition-colors',
            showCalories ? 'bg-accent' : 'bg-border',
          )}
        />
        <span
          className={clsx(
            'absolute block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            showCalories ? 'translate-x-[10px]' : '-translate-x-[10px]',
          )}
        />
      </button>
    </div>
  );
}

function SettingsView({ onEditProfile }: { onEditProfile: () => void }) {
  const user = useAuthStore((s) => s.user);
  const settingsProfile = useProfileStore((s) => s.profile);
  const clearProfile = useProfileStore((s) => s.clearProfile);
  const logout = useAuthStore((s) => s.logout);
  const buildPayload = useGistSyncStore((s) => s.buildPayload);
  const hydrateAllStores = useGistSyncStore((s) => s.hydrateAllStores);
  const schedulePush = useGistSyncStore((s) => s.schedulePush);

  const handleExportJSON = () => {
    const payload = buildPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutrikal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const raw = JSON.parse(reader.result as string);
        const { migratePayload } = await import('./utils/migratePayload');
        const payload = migratePayload(raw);
        if (confirm('¿Reemplazar todos tus datos actuales?')) {
          hydrateAllStores(payload);
        }
      } catch {
        alert('Archivo JSON inválido');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-heading font-bold text-text-primary">Ajustes</h2>

      {/* Account section */}
      {user && (
        <div className="bg-surface rounded-[2rem] shadow-ambient p-5 space-y-4">
          <h3 className="text-sm font-heading font-bold text-text-primary">Cuenta</h3>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <span className="text-white font-heading font-bold text-sm">
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-body font-medium text-text-primary">@{user.username}</p>
              <p className="text-[10px] font-body text-muted">{user.email}</p>
            </div>
          </div>

          <p className="text-[10px] font-body text-muted/60">
            Datos sincronizados en la nube
          </p>

          <div className="flex flex-col gap-2">
            <Button variant="secondary" icon={<Download size={16} />} onClick={handleExportJSON} fullWidth>
              Exportar backup JSON
            </Button>
            <label className="w-full">
              <Button variant="secondary" icon={<Printer size={16} />} onClick={() => document.getElementById('import-input')?.click()} fullWidth>
                Importar backup JSON
              </Button>
              <input
                id="import-input"
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <Button variant="danger" onClick={() => { if (confirm('Tu información está guardada en la nube. ¿Cerrar sesión?')) logout(); }} fullWidth>
              Cerrar sesión
            </Button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-[2rem] shadow-ambient p-5 space-y-4">
        <h3 className="text-sm font-heading font-bold text-text-primary">Perfil nutricional</h3>
        {settingsProfile ? (
          <div className="space-y-2">
            <p className="text-sm font-body text-text-primary">{settingsProfile.name}</p>
            <p className="text-xs font-body text-muted">
              {settingsProfile.heightCm} cm · {settingsProfile.weightKg} kg
            </p>
            <Button variant="secondary" icon={<UserCircle size={16} />} onClick={onEditProfile} fullWidth>
              Editar perfil
            </Button>
            <Button variant="danger" icon={<RotateCcw size={16} />} onClick={() => { if (confirm('¿Resetear tu perfil? Vas a tener que crearlo de nuevo.')) { clearProfile(); schedulePush(); } }} fullWidth>
              Resetear perfil
            </Button>
          </div>
        ) : (
          <Button variant="primary" icon={<UserCircle size={16} />} onClick={onEditProfile} fullWidth>
            Crear perfil
          </Button>
        )}
      </div>

      <div className="bg-surface rounded-[2rem] shadow-ambient p-5 space-y-4">
        <h3 className="text-sm font-heading font-bold text-text-primary">Apariencia</h3>
        <CaloriesToggle />
      </div>

      <div className="bg-surface rounded-[2rem] shadow-ambient p-5 space-y-4">
        <h3 className="text-sm font-heading font-bold text-text-primary">Datos</h3>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" icon={<Download size={16} />} onClick={handleExportJSON} fullWidth>
            Exportar datos (JSON)
          </Button>
          <Button variant="secondary" icon={<Printer size={16} />} onClick={() => window.print()} fullWidth>
            Imprimir semana actual
          </Button>
        </div>
      </div>

      <div className="text-center pt-4">
        <p className="text-xs text-muted font-body">NutriKal v5.0</p>
        <p className="text-[10px] text-muted/60 font-body mt-1">
          Datos sincronizados en la nube
        </p>
      </div>
    </div>
  );
}

export default App;
