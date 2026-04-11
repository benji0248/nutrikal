import { useState, useMemo, useRef } from 'react';
import type { Sex, Goal, ActivityLevel, DietaryRestriction, UserProfile } from '../../types';
import { GOAL_LABELS, GOAL_DESCRIPTIONS } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ActivityLevelSelector } from './ActivityLevel';
import { DietaryPrefs } from './DietaryPrefs';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { useProfileStore } from '../../store/useProfileStore';
import { useAuthStore } from '../../store/useAuthStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { generateId } from '../../utils/dateHelpers';
import { clsx } from 'clsx';
import { ArrowRight } from 'lucide-react';
import { JOURNAL } from '../assistant/journalTokens';

/**
 * Onboarding por **etapas** (un paso visible a la vez).
 * Los mocks de diseño a veces muestran todo el cuestionario en scroll; aquí el producto
 * prioriza foco y carga cognitiva baja — mantener este patrón salvo decisión explícita.
 */

const COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica',
  'Cuba', 'Ecuador', 'El Salvador', 'España', 'Estados Unidos',
  'Guatemala', 'Honduras', 'Italia', 'México', 'Nicaragua', 'Panamá',
  'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana', 'Uruguay',
  'Venezuela',
];

interface ProfileSetupProps {
  isOpen: boolean;
  onClose: () => void;
  existingProfile?: UserProfile | null;
}

type Step = 0 | 1 | 2 | 3;

export function ProfileSetup({ isOpen, onClose, existingProfile }: ProfileSetupProps) {
  const setProfile = useProfileStore((s) => s.setProfile);
  const user = useAuthStore((s) => s.user);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients = [...INGREDIENTS_DB, ...customIngredients];

  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState(
    () => existingProfile?.name ?? user?.displayName ?? user?.username ?? '',
  );
  const [nationality, setNationality] = useState(existingProfile?.nationality ?? 'Argentina');
  const [birthDate, setBirthDate] = useState(existingProfile?.birthDate ?? '');
  const [sex, setSex] = useState<Sex>(existingProfile?.sex ?? 'male');
  const [heightCm, setHeightCm] = useState(existingProfile?.heightCm?.toString() ?? '');
  const [weightKg, setWeightKg] = useState(existingProfile?.weightKg?.toString() ?? '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(existingProfile?.activityLevel ?? 'moderate');
  const [goal, setGoal] = useState<Goal>(existingProfile?.goal ?? 'maintain');
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>(existingProfile?.restrictions ?? []);
  const [dislikedIds, setDislikedIds] = useState<string[]>(existingProfile?.dislikedIngredientIds ?? []);
  const [dislikedCategories, setDislikedCategories] = useState<string[]>(existingProfile?.dislikedCategories ?? []);
  const [allowedExceptions, setAllowedExceptions] = useState<string[]>(existingProfile?.allowedExceptions ?? []);
  const [countryQuery, setCountryQuery] = useState(nationality);
  const [showCountries, setShowCountries] = useState(false);
  const countryInputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [countryQuery]);

  const canNext = (): boolean => {
    if (step === 0) {
      return (
        name.trim().length > 0 &&
        birthDate.length > 0 &&
        Number(heightCm) > 0 &&
        Number(weightKg) > 0
      );
    }
    return true;
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: existingProfile?.id ?? generateId(),
      name: name.trim() || user?.username || 'Usuario',
      birthDate,
      sex,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      activityLevel,
      goal,
      restrictions,
      dislikedIngredientIds: dislikedIds,
      dislikedCategories,
      allowedExceptions,
      nationality,
      createdAt: existingProfile?.createdAt ?? now,
      updatedAt: now,
      lastRecalibration: now,
    };
    setProfile(profile);
    onClose();
  };

  const stepLabels = ['Datos', 'Actividad', 'Objetivo', 'Preferencias'];

  const content = (
    <div className="space-y-5">
      {step === 0 && (
        <div className="text-center space-y-2 pb-1">
          <p className="font-heading text-lg font-bold" style={{ color: JOURNAL.primary }}>
            Tu diario de salud
          </p>
          <p className="text-sm font-body leading-relaxed px-1" style={{ color: JOURNAL.muted }}>
            Unos datos para personalizar tu energía y tus comidas.
          </p>
        </div>
      )}

      {/* Step indicator — glow orgánico (primary) */}
      <div className="flex items-center justify-center gap-0">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={clsx(
                  'w-2.5 h-2.5 rounded-full transition-colors',
                  i <= step ? 'bg-[#226046]' : 'bg-[#e0e5d8]',
                )}
              />
              <span
                className={clsx(
                  'text-[10px] font-body transition-colors max-w-[52px] text-center leading-tight',
                  i === step
                    ? 'text-[#226046] font-semibold'
                    : i < step
                      ? 'text-[#191c17]'
                      : 'text-[#5a6258]',
                )}
              >
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div className={clsx('w-8 h-0.5 mx-1 -mt-4', i < step ? 'bg-[#226046]' : 'bg-[#e0e5d8]')} />
            )}
          </div>
        ))}
      </div>

      <p className="text-center font-body text-xs" style={{ color: JOURNAL.muted }}>
        Paso {step + 1} de 4 — {stepLabels[step]}
      </p>

      {/* Step 0: Basic data */}
      {step === 0 && (
        <div className="rounded-[2rem] bg-white/80 p-4 shadow-[0px_12px_32px_rgba(25,28,23,0.06)] space-y-3">
          <Input
            tone="journal"
            label="¿Cómo te llamás?"
            type="text"
            placeholder="Tu nombre..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <div className="relative">
            <label className="block text-sm font-medium mb-1.5 text-[#191c17]">País</label>
            <input
              ref={countryInputRef}
              type="text"
              value={countryQuery}
              onChange={(e) => {
                setCountryQuery(e.target.value);
                setShowCountries(true);
              }}
              onFocus={() => setShowCountries(true)}
              onBlur={() => {
                setTimeout(() => setShowCountries(false), 150);
              }}
              placeholder="Buscar país..."
              className="w-full rounded-2xl border-0 bg-white px-4 py-3 text-sm font-body text-[#191c17] placeholder:text-[#191c17]/45 shadow-[0px_8px_24px_rgba(25,28,23,0.06)] focus:outline-none focus:ring-2 focus:ring-[#226046]/25 min-h-[48px]"
            />
            {showCountries && filteredCountries.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 rounded-2xl bg-white shadow-[0px_16px_40px_rgba(25,28,23,0.1)] max-h-48 overflow-y-auto py-1">
                {filteredCountries.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setNationality(c);
                      setCountryQuery(c);
                      setShowCountries(false);
                      countryInputRef.current?.blur();
                    }}
                    className={clsx(
                      'w-full text-left px-4 py-2.5 text-sm font-body transition-colors min-h-[44px]',
                      c === nationality ? 'text-[#226046] bg-[#f3f5eb]' : 'text-[#191c17] hover:bg-[#f8faf1]',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            tone="journal"
            label="Fecha de nacimiento"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
          <div>
            <p className="text-sm font-medium text-[#191c17] mb-1.5">Sexo biológico</p>
            <div className="flex gap-2">
              {(['male', 'female'] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={clsx(
                    'flex-1 py-3 rounded-[1.25rem] text-sm font-body font-medium transition-all shadow-[0px_8px_24px_rgba(25,28,23,0.06)]',
                    sex === s
                      ? 'bg-[#226046] text-[#f8faf6]'
                      : 'bg-white text-[#5a6258] hover:text-[#191c17]',
                  )}
                >
                  {s === 'male' ? 'Masculino' : 'Femenino'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              tone="journal"
              label="Altura (cm)"
              type="number"
              placeholder="170"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
            />
            <Input
              tone="journal"
              label="Peso (kg)"
              type="number"
              placeholder="70"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 1: Activity */}
      {step === 1 && <ActivityLevelSelector tone="journal" value={activityLevel} onChange={setActivityLevel} />}

      {/* Step 2: Goal */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-center font-heading text-base font-bold text-[#191c17]">¿Cuál es tu meta principal?</p>
          {(['lose', 'maintain', 'gain'] as Goal[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(g)}
              className={clsx(
                'w-full p-4 rounded-[2rem] transition-all text-left shadow-[0px_8px_24px_rgba(25,28,23,0.06)]',
                goal === g ? 'bg-[#226046] text-[#f8faf6]' : 'bg-white text-[#191c17] hover:shadow-[0px_12px_28px_rgba(25,28,23,0.08)]',
              )}
            >
              <p className={clsx('text-sm font-body font-semibold', goal === g ? 'text-[#f8faf6]' : 'text-[#191c17]')}>
                {GOAL_LABELS[g]}
              </p>
              <p className={clsx('text-xs font-body mt-1', goal === g ? 'text-[#f8faf6]/80' : 'text-[#5a6258]')}>
                {GOAL_DESCRIPTIONS[g]}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Step 3: Dietary */}
      {step === 3 && (
        <DietaryPrefs
          tone="journal"
          restrictions={restrictions}
          onRestrictionsChange={setRestrictions}
          dislikedIds={dislikedIds}
          onDislikedChange={setDislikedIds}
          dislikedCategories={dislikedCategories}
          onDislikedCategoriesChange={setDislikedCategories}
          allowedExceptions={allowedExceptions}
          onAllowedExceptionsChange={setAllowedExceptions}
          allIngredients={allIngredients}
        />
      )}

      {step === 3 && (
        <>
          <div
            className="rounded-[2rem] p-4 text-center shadow-[0px_12px_32px_rgba(25,28,23,0.06)]"
            style={{ backgroundColor: JOURNAL.primary }}
          >
            <p className="font-heading text-sm font-bold text-[#f8faf6]">Cálculo personalizado</p>
            <p className="mt-1 text-xs font-body leading-relaxed text-[#f8faf6]/85">
              Usamos tu perfil para estimar energía y porciones de forma coherente con tus preferencias.
            </p>
          </div>
          <p className="text-center text-[11px] font-body" style={{ color: JOURNAL.muted }}>
            Podés editar estos datos más adelante en ajustes.
          </p>
        </>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-1">
        {step > 0 && (
          <Button
            tone="journal"
            variant="secondary"
            onClick={() => setStep((s) => (s - 1) as Step)}
            fullWidth
          >
            Anterior
          </Button>
        )}
        {step < 3 ? (
          <Button
            tone="journal"
            variant="primary"
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={!canNext()}
            fullWidth
          >
            Siguiente
          </Button>
        ) : (
          <Button tone="journal" variant="primary" onClick={handleSave} fullWidth>
            <span className="inline-flex items-center justify-center gap-2">
              {existingProfile ? 'Guardar cambios' : 'Calcular mi plan'}
              {!existingProfile && <ArrowRight size={18} strokeWidth={2.25} aria-hidden />}
            </span>
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={existingProfile ? 'Editar perfil' : 'Crear perfil'}
        snap="full"
        tone="journal"
      >
        {content}
      </BottomSheet>
      <Modal isOpen={isOpen} onClose={onClose} title={existingProfile ? 'Editar perfil' : 'Crear perfil'} tone="journal">
        {content}
      </Modal>
    </>
  );
}
