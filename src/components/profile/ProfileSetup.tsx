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
  const profileName = existingProfile?.name ?? user?.displayName ?? user?.username ?? '';
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
    if (step === 0) return birthDate.length > 0 && Number(heightCm) > 0 && Number(weightKg) > 0;
    return true;
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: existingProfile?.id ?? generateId(),
      name: profileName,
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
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={clsx(
                  'w-2.5 h-2.5 rounded-full transition-colors',
                  i <= step ? 'bg-accent' : 'bg-surface2',
                )}
              />
              <span className={clsx(
                'text-[10px] font-body transition-colors',
                i === step ? 'text-accent font-medium' : i < step ? 'text-text-primary' : 'text-muted',
              )}>
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div className={clsx('w-8 h-0.5 mx-1 -mt-4', i < step ? 'bg-accent' : 'bg-surface2')} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Basic data */}
      {step === 0 && (
        <div className="space-y-3">
          <div className="relative">
            <label className="block text-sm font-medium text-text-primary mb-1.5">País</label>
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
                // Delay to allow click on dropdown item
                setTimeout(() => setShowCountries(false), 150);
              }}
              placeholder="Buscar país..."
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-body text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/40 outline-none min-h-[48px]"
            />
            {showCountries && filteredCountries.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border bg-surface shadow-lg max-h-48 overflow-y-auto">
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
                      'w-full text-left px-3 py-2.5 text-sm font-body transition-colors min-h-[44px]',
                      c === nationality
                        ? 'text-accent bg-accent/10'
                        : 'text-text-primary hover:bg-surface2/50',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input label="Fecha de nacimiento" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          <div>
            <p className="text-sm font-medium text-text-primary mb-1.5">Sexo biológico</p>
            <div className="flex gap-2">
              {(['male', 'female'] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={clsx(
                    'flex-1 py-2.5 rounded-xl text-sm font-body font-medium border transition-all',
                    sex === s ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted',
                  )}
                >
                  {s === 'male' ? 'Masculino' : 'Femenino'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Altura (cm)" type="number" placeholder="170" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            <Input label="Peso (kg)" type="number" placeholder="70" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 1: Activity */}
      {step === 1 && <ActivityLevelSelector value={activityLevel} onChange={setActivityLevel} />}

      {/* Step 2: Goal */}
      {step === 2 && (
        <div className="space-y-2">
          {(['lose', 'maintain', 'gain'] as Goal[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGoal(g)}
              className={clsx(
                'w-full p-4 rounded-2xl border transition-all text-left',
                goal === g
                  ? 'border-accent bg-accent/10 ring-1 ring-accent/40'
                  : 'border-border bg-surface2/30 hover:bg-surface2/60',
              )}
            >
              <p className={clsx('text-sm font-body font-medium', goal === g ? 'text-accent' : 'text-text-primary')}>
                {GOAL_LABELS[g]}
              </p>
              <p className={clsx('text-xs font-body mt-0.5', goal === g ? 'text-accent/70' : 'text-muted')}>
                {GOAL_DESCRIPTIONS[g]}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Step 3: Dietary */}
      {step === 3 && (
        <DietaryPrefs
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

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)} fullWidth>
            Anterior
          </Button>
        )}
        {step < 3 ? (
          <Button variant="primary" onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canNext()} fullWidth>
            Siguiente
          </Button>
        ) : (
          <Button variant="primary" onClick={handleSave} fullWidth>
            {existingProfile ? 'Guardar cambios' : 'Crear perfil'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title={existingProfile ? 'Editar perfil' : 'Crear perfil'} snap="full">
        {content}
      </BottomSheet>
      <Modal isOpen={isOpen} onClose={onClose} title={existingProfile ? 'Editar perfil' : 'Crear perfil'}>
        {content}
      </Modal>
    </>
  );
}
