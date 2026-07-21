import { useState, useEffect, useCallback } from 'react';
import { Sun, CalendarDays, LayoutGrid, UserCircle, RotateCcw, Scale, Bell, Smartphone, Calculator } from 'lucide-react';
import { WeekPlanningSetup } from './components/profile/WeekPlanningSetup';
import { GOAL_LABELS, MEAL_PATTERN_LABELS } from './types';
import { normalizeWeekPlanningProfile } from './utils/flexDayHelpers';
import { WEEKDAY_FLEX_MODE_LABELS } from './utils/flexDayHelpers';
import { clsx } from 'clsx';
import { useTheme } from './hooks/useTheme';
import { useAuthStore } from './store/useAuthStore';
import { useCalendarStore } from './store/useCalendarStore';
import { useProfileStore } from './store/useProfileStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useCalculatorStore } from './store/useCalculatorStore';
import { useIngredientsStore } from './store/useIngredientsStore';
import { useRecipesStore } from './store/useRecipesStore';
import { useShoppingStore } from './store/useShoppingStore';
import { useHistorialStore } from './store/useHistorialStore';
import { useIngredientSignalStore } from './store/useIngredientSignalStore';
import { useWeekPlanningStore } from './store/useWeekPlanningStore';
import { usePlanRotationStore } from './store/usePlanRotationStore';
import { useProgressStore } from './store/useProgressStore';
import { useChatStore } from './store/useChatStore';
import {
  batchLoadAllData,
  loadProfile,
  loadProgressCheckIns,
  migrateUser,
} from './services/apiService';
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
import { ProgressOverview } from './components/profile/ProgressOverview';
import { CalorieCalculator } from './components/calculator/CalorieCalculator';
import { BottomSheet } from './components/ui/BottomSheet';
import { Modal } from './components/ui/Modal';
import { todayKey } from './utils/dateHelpers';

import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { LoadingScreen } from './components/auth/LoadingScreen';
import { UserMenu } from './components/auth/UserMenu';

import { usePersistedAppTab } from './hooks/usePersistedAppTab';

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
  const progressCheckIns = useProgressStore((s) => s.checkIns);
  const getProgressPromptLevel = useProgressStore((s) => s.getPromptLevel);

  const [ready, setReady] = useState(false);
  const { activeTab, setActiveTab } = usePersistedAppTab();
  const goToAssistant = useCallback(() => setActiveTab('assistant'), [setActiveTab]);
  const view = useCalendarStore((s) => s.view);
  const setView = useCalendarStore((s) => s.setView);
  const goToToday = useCalendarStore((s) => s.goToToday);

  const [showRecalibrate, setShowRecalibrate] = useState(false);
  const [recalibrateSource, setRecalibrateSource] = useState<'scheduled' | 'manual'>('scheduled');
  const [showProgress, setShowProgress] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const openManualCheckIn = useCallback(() => {
    setRecalibrateSource('manual');
    setShowRecalibrate(true);
  }, []);

  // New init flow: migrate → batch-load → hydrate stores
  useEffect(() => {
    async function initializeData() {
      try {
        // Step 1: Migrate blob data to new tables (idempotent)
        try {
          await migrateUser();
        } catch (e) {
          console.error('Migration error (non-blocking):', e);
        }

        // Step 2: Load all data from new tables
        const data = await batchLoadAllData();

        // Step 3: Hydrate all stores
        useCalendarStore.getState().hydrateMeals(data.meals, data.dayNotes);
        useCalendarStore.getState().hydrateNotifications(data.notifications);
        useProfileStore.getState().hydrateProfile(data.profile);
        if (!data.profile) {
          try {
            const fallbackProfile = await loadProfile();
            if (fallbackProfile) {
              useProfileStore.getState().hydrateProfile(fallbackProfile);
              const checkIns = await loadProgressCheckIns();
              useProgressStore.getState().hydrateCheckIns(checkIns);
            }
          } catch (profileErr) {
            console.error('Profile fallback load error:', profileErr);
          }
        }
        useCalculatorStore.getState().hydrateRecipes(data.calculatorRecipes);
        useIngredientsStore.getState().hydrateIngredients(data.customIngredients);
        useRecipesStore.getState().hydrateDishes(data.customDishes);
        useShoppingStore.getState().hydrateLists(data.shoppingLists);
        useSettingsStore.getState().hydrateSettings(data.settings);
        useWeekPlanningStore.getState().hydrateWeekPlanning(data.weekPlanning ?? null);
        useHistorialStore.getState().hydrateFavorites(data.favorites);
        useIngredientSignalStore.getState().hydrateSignals(data.ingredientSignals);
        usePlanRotationStore.getState().hydrate(data.planMemory ?? undefined);
        useProgressStore.getState().hydrateCheckIns(data.progressCheckIns ?? []);
        useChatStore.getState().hydrate(data.chatConversation ?? null);
      } catch (e) {
        console.error('Init data load error:', e);
        useChatStore.getState().hydrate(null);
        try {
          const fallbackProfile = await loadProfile();
          if (fallbackProfile) {
            useProfileStore.getState().hydrateProfile(fallbackProfile);
            const checkIns = await loadProgressCheckIns();
            useProgressStore.getState().hydrateCheckIns(checkIns);
          }
        } catch (profileErr) {
          console.error('Profile fallback load error:', profileErr);
        }
      }

      // Decide initial state
      setTimeout(() => {
        const p = useProfileStore.getState().profile;
        if (!p) {
          setShowProfileEdit(true);
        }
        setReady(true);
      }, 100);
    }

    initializeData();
  }, []);

  // El prompt fuerte abre captura; el prompt suave se comunica en el chat.
  useEffect(() => {
    if (ready && profile && getProgressPromptLevel() === 'hard') {
      const timeout = setTimeout(() => {
        setRecalibrateSource('scheduled');
        setShowRecalibrate(true);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [ready, profile, progressCheckIns, getProgressPromptLevel]);

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
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="px-4 md:px-12 py-6 pb-24 md:pb-12 max-w-7xl mx-auto">
          {activeTab === 'calendar' && view === 'day' && <DayView onNavigateToAssistant={goToAssistant} />}
          {activeTab === 'calendar' && view === 'week' && <WeekView onNavigateToAssistant={goToAssistant} />}
          {activeTab === 'calendar' && view === 'month' && <MonthView onNavigateToAssistant={goToAssistant} />}
          {activeTab === 'assistant' && <ChatAssistant onTabChange={setActiveTab} />}
          {activeTab === 'historial' && <HistorialView />}
          {activeTab === 'shopping' && <ShoppingListView />}
          {activeTab === 'settings' && (
            <SettingsView
              onEditProfile={() => setShowProfileEdit(true)}
              onOpenProgress={() => setShowProgress(true)}
            />
          )}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <ProfileRecalibrate
        isOpen={showRecalibrate}
        onClose={() => setShowRecalibrate(false)}
        onEditProfile={() => { setShowRecalibrate(false); setShowProfileEdit(true); }}
        source={recalibrateSource}
      />
      <BottomSheet
        isOpen={showProgress}
        onClose={() => setShowProgress(false)}
        title="¿Voy bien?"
      >
        <ProgressOverview
          onAddCheckIn={() => {
            setShowProgress(false);
            openManualCheckIn();
          }}
        />
      </BottomSheet>
      <Modal
        isOpen={showProgress}
        onClose={() => setShowProgress(false)}
        title="¿Voy bien?"
      >
        <ProgressOverview
          onAddCheckIn={() => {
            setShowProgress(false);
            openManualCheckIn();
          }}
        />
      </Modal>
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

function WeekPlanningSettingsRow() {
  const weekPlanning = useWeekPlanningStore((s) => s.weekPlanning);
  const [showSetup, setShowSetup] = useState(false);

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-[#40493d] font-semibold px-2">
          Mi rutina semanal
        </h2>
        <div className="bg-[#f3f5eb] rounded-lg p-2">
          <div className="flex items-center justify-between p-4 bg-[#ffffff] rounded-xl">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-[#226046]/10 flex items-center justify-center text-[#226046] shrink-0">
                <CalendarDays size={24} />
              </div>
              {weekPlanning?.completedAt ? (
                <div className="min-w-0">
                  <p className="font-semibold text-[#191c17] text-sm truncate">
                    {MEAL_PATTERN_LABELS[weekPlanning.mealPattern]}
                  </p>
                  <p className="text-xs text-[#40493d] truncate">
                    {(() => {
                      const wp = normalizeWeekPlanningProfile(weekPlanning);
                      if (wp.weekdayFlexRules.length === 0) return 'Todos los días normales';
                      return wp.weekdayFlexRules
                        .map((r) => {
                          const d = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][r.weekday];
                          return `${d}: ${r.nickname ?? WEEKDAY_FLEX_MODE_LABELS[r.mode]}`;
                        })
                        .join(' · ');
                    })()}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-[#191c17]">Sin configurar</p>
                  <p className="text-sm text-[#40493d]">Para planificar tu semana</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="bg-[#226046] text-[#ffffff] px-4 py-2 rounded-full text-sm font-medium hover:scale-95 transition-transform shrink-0"
            >
              {weekPlanning?.completedAt ? 'Editar' : 'Configurar'}
            </button>
          </div>
        </div>
      </section>
      <WeekPlanningSetup
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
        existing={weekPlanning}
      />
    </>
  );
}

function SettingsView({
  onEditProfile,
  onOpenProgress,
}: {
  onEditProfile: () => void;
  onOpenProgress: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const settingsProfile = useProfileStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const showCalories = useSettingsStore((s) => s.showCalories);
  const setShowCalories = useSettingsStore((s) => s.setShowCalories);
  const useGrams = useSettingsStore((s) => s.useGrams);
  const setUseGrams = useSettingsStore((s) => s.setUseGrams);
  const [showCalculator, setShowCalculator] = useState(false);

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
                    {GOAL_LABELS[settingsProfile.goal]} · perfil listo
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

      {settingsProfile && (
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-[#40493d] font-semibold px-2">
            Progreso
          </h2>
          <div className="bg-[#f3f5eb] rounded-lg p-2">
            <button
              type="button"
              onClick={onOpenProgress}
              className="flex w-full items-center justify-between p-4 bg-[#ffffff] rounded-xl text-left hover:bg-[#edefe6] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#226046]/10 flex items-center justify-center text-[#226046]">
                  <Scale size={24} />
                </div>
                <div>
                  <p className="font-semibold text-[#191c17]">¿Voy bien?</p>
                  <p className="text-sm text-[#40493d]">Una lectura simple de tus check-ins</p>
                </div>
              </div>
              <span className="text-[#707a6c] font-bold text-xs uppercase tracking-widest">
                Abrir
              </span>
            </button>
          </div>
        </section>
      )}

      <WeekPlanningSettingsRow />

      <section className="space-y-4">
        <div className="px-2 space-y-1">
          <h2 className="text-xs uppercase tracking-widest text-[#40493d] font-semibold">Modo Pro</h2>
          <p className="text-xs font-body text-[#707a6c]">
            Opt-in: números y gramos. Por defecto seguís en Modo Simple.
          </p>
        </div>
        <div className="bg-[#f3f5eb] rounded-lg p-2 space-y-2">
          <button
            type="button"
            onClick={() => setShowCalories(!showCalories)}
            className="flex w-full items-center justify-between p-4 bg-[#ffffff] rounded-xl text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#3d795d]/10 flex items-center justify-center text-[#226046]">
                <LayoutGrid size={24} />
              </div>
              <div>
                <p className="font-semibold text-[#191c17]">Ver calorías</p>
                <p className="text-sm text-[#40493d]">
                  {showCalories ? 'kcal y macros visibles' : 'Modo Simple — sin números'}
                </p>
              </div>
            </div>
            <div className={clsx('w-12 h-6 rounded-full relative p-1 flex items-center transition-colors', showCalories ? 'bg-[#b1f0ce]' : 'bg-[#bfcaba]/30')}>
              <div className={clsx('w-4 h-4 rounded-full shadow-sm transition-transform', showCalories ? 'bg-[#226046] translate-x-6' : 'bg-[#ffffff] translate-x-0')} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setUseGrams(!useGrams)}
            className="flex w-full items-center justify-between p-4 bg-[#ffffff] rounded-xl text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#a05d22]/10 flex items-center justify-center text-[#824509]">
                <Scale size={24} />
              </div>
              <div>
                <p className="font-semibold text-[#191c17]">Usar gramos</p>
                <p className="text-sm text-[#40493d]">
                  {useGrams ? 'Porciones en gramos' : 'Medidas caseras (rebanadas, tazas…)'}
                </p>
              </div>
            </div>
            <div className={clsx('w-12 h-6 rounded-full relative p-1 flex items-center transition-colors', useGrams ? 'bg-[#b1f0ce]' : 'bg-[#bfcaba]/30')}>
              <div className={clsx('w-4 h-4 rounded-full shadow-sm transition-transform', useGrams ? 'bg-[#226046] translate-x-6' : 'bg-[#ffffff] translate-x-0')} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowCalculator(true)}
            className="flex w-full items-center justify-between p-4 bg-[#ffffff] rounded-xl text-left hover:bg-[#edefe6] transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#226046]/10 flex items-center justify-center text-[#226046]">
                <Calculator size={24} />
              </div>
              <div>
                <p className="font-semibold text-[#191c17]">Calculadora</p>
                <p className="text-sm text-[#40493d]">Sumá ingredientes y macros a mano</p>
              </div>
            </div>
            <span className="text-[#707a6c] font-bold text-xs uppercase tracking-widest">Abrir</span>
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-[#40493d] font-semibold px-2">Próximamente</h2>
        <div className="bg-[#f3f5eb] rounded-lg p-2 space-y-2 opacity-70">
          <div className="flex items-center justify-between p-4 bg-[#ffffff] rounded-xl cursor-not-allowed">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#4a5568]/10 flex items-center justify-center text-[#2d3748]">
                <Bell size={24} />
              </div>
              <div>
                <p className="font-semibold text-[#191c17]">Notificaciones de Hábitos</p>
                <p className="text-sm text-[#40493d]">Recordatorios de agua y comidas</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#707a6c] uppercase tracking-widest">Pronto</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#ffffff] rounded-xl cursor-not-allowed">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2b6cb0]/10 flex items-center justify-center text-[#2b6cb0]">
                <Smartphone size={24} />
              </div>
              <div>
                <p className="font-semibold text-[#191c17]">Sincronización Fit</p>
                <p className="text-sm text-[#40493d]">Apple Health & Google Fit</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#707a6c] uppercase tracking-widest">Pronto</span>
          </div>
        </div>
      </section>

      <div className="pt-4 pb-8 text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#e7e9e0] rounded-2xl mb-2">
          <LayoutGrid size={20} className="text-[#40493d]" />
        </div>
        <p className="text-[#40493d] font-medium text-sm">NutriKal v5.0</p>
        <p className="text-xs text-[#707a6c] italic">Hecho con conciencia nutricional</p>
      </div>

      <div className="md:hidden">
        <BottomSheet
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
          title="Calculadora"
        >
          <CalorieCalculator
            targetDate={todayKey()}
            targetMealType="almuerzo"
            onSentToMeal={() => setShowCalculator(false)}
          />
        </BottomSheet>
      </div>
      <div className="hidden md:block">
        <Modal
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
          title="Calculadora"
        >
          <CalorieCalculator
            targetDate={todayKey()}
            targetMealType="almuerzo"
            onSentToMeal={() => setShowCalculator(false)}
          />
        </Modal>
      </div>
    </div>
  );
}

export default App;
