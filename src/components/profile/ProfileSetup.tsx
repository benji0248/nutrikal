import { useState } from 'react';
import type { Sex, Goal, ActivityLevel, DietaryRestriction, UserProfile } from '../../types';
import { GOAL_LABELS } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ActivityLevelSelector } from './ActivityLevel';
import { DietaryPrefs } from './DietaryPrefs';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { useProfileStore } from '../../store/useProfileStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { generateId } from '../../utils/dateHelpers';
import { clsx } from 'clsx';

interface ProfileSetupProps {
  isOpen: boolean;
  onClose: () => void;
  existingProfile?: UserProfile | null;
}

type Step = 0 | 1 | 2 | 3;

export function ProfileSetup({ isOpen, onClose, existingProfile }: ProfileSetupProps) {
  const setProfile = useProfileStore((s) => s.setProfile);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const allIngredients = [...INGREDIENTS_DB, ...customIngredients];

  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState(existingProfile?.name ?? '');
  const [birthDate, setBirthDate] = useState(existingProfile?.birthDate ?? '');
  const [sex, setSex] = useState<Sex>(existingProfile?.sex ?? 'male');
  const [heightCm, setHeightCm] = useState(existingProfile?.heightCm?.toString() ?? '');
  const [weightKg, setWeightKg] = useState(existingProfile?.weightKg?.toString() ?? '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(existingProfile?.activityLevel ?? 'moderate');
  const [goal, setGoal] = useState<Goal>(existingProfile?.goal ?? 'maintain');
  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>(existingProfile?.restrictions ?? []);
  const [dislikedIds, setDislikedIds] = useState<string[]>(existingProfile?.dislikedIngredientIds ?? []);

  const canNext = (): boolean => {
    if (step === 0) return name.trim().length > 0 && birthDate.length > 0 && Number(heightCm) > 0 && Number(weightKg) > 0;
    return true;
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: existingProfile?.id ?? generateId(),
      name: name.trim(),
      birthDate,
      sex,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      activityLevel,
      goal,
      restrictions,
      dislikedIngredientIds: dislikedIds,
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
      <div className="flex items-center gap-1 justify-center">
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className={clsx(
                'w-2 h-2 rounded-full transition-colors',
                i <= step ? 'bg-accent' : 'bg-surface2',
              )}
            />
            {i < stepLabels.length - 1 && (
              <div className={clsx('w-6 h-0.5', i < step ? 'bg-accent' : 'bg-surface2')} />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-xs font-body text-muted">{stepLabels[step]}</p>

      {/* Step 0: Basic data */}
      {step === 0 && (
        <div className="space-y-3">
          <Input label="Nombre" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
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
