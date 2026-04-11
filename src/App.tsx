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

import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { LoadingScreen } from './components/auth/LoadingScreen';
import { UserMenu } from './components/auth/UserMenu';

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

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-dvh bg-bg text-text-primary">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="md:ml-72 relative z-10 min-h-screen">
        <header className="fixed md:sticky top-0 w-full md:w-auto z-30 bg-[#f8faf1]/80 backdrop-blur-xl md:border-b md:border-border/30 no-print">
          <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto md:px-12 md:py-3">
            <div className="flex items-center gap-3 md:hidden">
              <div className="w-10 h-10 rounded-full bg-[#e1e3da] flex items-center justify-center overflow-hidden">
                <span className="text-[#226046] font-heading font-extrabold text-sm">NK</span>
              </div>
              <span className="font-heading font-bold text-xl tracking-tight text-[#226046]">NutriKal</span>
            </div>
            <div className="hidden md:flex items-center gap-3" />
            <div className="flex items-center gap-2">
              <button className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-[#f3f5eb] text-[#226046] active:scale-95 transition-transform" aria-label="Sync">
                <RotateCcw size={18} />
              </button>
              {activeTab === 'calendar' && (
                <>
                  <div className="hidden md:flex items-center gap-0.5 bg-surface2 rounded-xl p-0.5">
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

function SettingsView({ onEditProfile }: { onEditProfile: () => void }) {
  const user = useAuthStore((s) => s.user);
  const settingsProfile = useProfileStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const buildPayload = useGistSyncStore((s) => s.buildPayload);
  const hydrateAllStores = useGistSyncStore((s) => s.hydrateAllStores);
  const showCalories = useSettingsStore((s) => s.showCalories);
  const setShowCalories = useSettingsStore((s) => s.setShowCalories);

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
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-1">
        <h1 className="text-3xl font-heading font-bold text-[#226046] tracking-tight">Ajustes</h1>
        <p className="text-[#40493d] font-body">Personaliza tu experiencia de bienestar y nutrición.</p>
      </section>

      {user && (
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-[#40493d] font-semibold px-2">Cuenta</h2>
          <div className="bg-[#f3f5eb] rounded-lg p-2 space-y-1">
            <div
              onClick={() => { if (confirm('¿Cerrar sesión?')) logout(); }}
              className="flex items-center justify-between p-4 bg-[#ffffff] rounded-xl hover:bg-[#edefe6] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#3d795d]/10 flex items-center justify-center text-[#226046]">
                  <UserCircle size={24} />
                </div>
                <div>
                  <p className="font-semibold text-[#191c17]">{user.displayName || user.username}</p>
                  <p className="text-sm text-[#40493d]">{user.email}</p>
                </div>
              </div>
              <span className="text-[#707a6c] font-bold text-xs group-hover:translate-x-1 transition-transform uppercase tracking-widest">
                Salir
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-[#40493d] font-semibold px-2">Perfil Nutricional</h2>
        <div className="bg-[#f3f5eb] rounded-lg p-2">
          <div className="flex items-center justify-between p-4 bg-[#ffffff] rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#fd9d1a]/10 flex items-center justify-center text-[#895100]">
                <UserCircle size={24} />
              </div>
              {settingsProfile ? (
                <div>
                  <p className="font-semibold text-[#191c17] text-sm">Objetivo de Salud</p>
                  <p className="text-xs text-[#40493d]">
                    {settingsProfile.heightCm} cm • {settingsProfile.weightKg} kg
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-[#191c17]">Sin Perfil</p>
                  <p className="text-sm text-[#40493d]">Crea tu perfil</p>
                </div>
              )}
            </div>
            <button
              onClick={onEditProfile}
              className="bg-[#226046] text-[#ffffff] px-4 py-2 rounded-full text-sm font-medium hover:scale-95 transition-transform"
            >
              {settingsProfile ? 'Editar' : 'Crear'}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-[#40493d] font-semibold px-2">Preferencias</h2>
        <div className="bg-[#f3f5eb] rounded-lg p-2 space-y-2">
          {/* Theme Toggle - Static */}
          <div className="flex items-center justify-between p-4 bg-[#ffffff] rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#a05d22]/10 flex items-center justify-center text-[#824509]">
                <Sun size={24} />
              </div>
              <div>
                <p className="font-semibold text-[#191c17]">Apariencia</p>
                <p className="text-sm text-[#40493d]">Modo Claro activado</p>
              </div>
            </div>
            <div className="w-12 h-6 bg-[#e7e9e0] rounded-full relative p-1 flex items-center cursor-default">
              <div className="w-4 h-4 bg-[#226046] rounded-full shadow-sm translate-x-0 transition-transform" />
            </div>
          </div>

          {/* Calories Toggle */}
          <div
            onClick={() => setShowCalories(!showCalories)}
            className="flex items-center justify-between p-4 bg-[#ffffff] rounded-xl cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#3d795d]/10 flex items-center justify-center text-[#226046]">
                <LayoutGrid size={24} />
              </div>
              <div>
                <p className="font-semibold text-[#191c17]">Mostrar Calorías</p>
                <p className="text-sm text-[#40493d]">Visibles en el feed personal</p>
              </div>
            </div>
            <div className={clsx('w-12 h-6 rounded-full relative p-1 flex items-center transition-colors', showCalories ? 'bg-[#b1f0ce]' : 'bg-[#bfcaba]/30')}>
              <div className={clsx('w-4 h-4 rounded-full shadow-sm transition-transform', showCalories ? 'bg-[#226046] translate-x-6' : 'bg-[#ffffff] translate-x-0')} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-[#40493d] font-semibold px-2">Datos y Privacidad</h2>
        <div className="bg-[#f3f5eb] rounded-lg p-2 grid grid-cols-2 gap-2">
          <button
            onClick={handleExportJSON}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-[#ffffff] rounded-xl hover:bg-[#226046]/5 transition-colors"
          >
            <Download className="text-[#226046]" size={32} />
            <span className="text-sm font-semibold text-[#191c17]">Exportar JSON</span>
          </button>
          <label className="flex flex-col items-center justify-center gap-3 p-6 bg-[#ffffff] rounded-xl hover:bg-[#226046]/5 transition-colors cursor-pointer">
            <Printer className="text-[#226046]" size={32} />
            <span className="text-sm font-semibold text-[#191c17]">Importar JSON</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </section>

      <div className="pt-4 pb-8 text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#e7e9e0] rounded-2xl mb-2">
          <LayoutGrid size={20} className="text-[#40493d]" />
        </div>
        <p className="text-[#40493d] font-medium text-sm">NutriKal v5.0</p>
        <p className="text-xs text-[#707a6c] italic">Hecho con conciencia nutricional</p>
      </div>
    </div>
  );
}

export default App;
