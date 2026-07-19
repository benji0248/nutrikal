import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useProfileStore } from '../../store/useProfileStore';
import { useProgressStore } from '../../store/useProgressStore';
import type { PeriodExperience } from '../../types';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';

interface ProfileRecalibrateProps {
  isOpen: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  source?: 'scheduled' | 'manual';
}

const EXPERIENCE_OPTIONS: Array<{ value: PeriodExperience; label: string }> = [
  { value: 'easy', label: 'Fácil' },
  { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Difícil' },
];

export function ProfileRecalibrate({
  isOpen,
  onClose,
  onEditProfile,
  source = 'scheduled',
}: ProfileRecalibrateProps) {
  const profile = useProfileStore((s) => s.profile);
  const addCheckIn = useProgressStore((s) => s.addCheckIn);
  const isSaving = useProgressStore((s) => s.isSaving);
  const saveError = useProgressStore((s) => s.saveError);
  const clearSaveError = useProgressStore((s) => s.clearSaveError);
  const [newWeight, setNewWeight] = useState<string | null>(null);
  const [periodExperience, setPeriodExperience] = useState<PeriodExperience | undefined>();

  const handleClose = () => {
    setNewWeight(null);
    setPeriodExperience(undefined);
    clearSaveError();
    onClose();
  };

  const handleQuickUpdate = async () => {
    const w = Number(newWeight ?? profile?.weightKg);
    const ok = await addCheckIn({
      weightKg: w,
      periodExperience,
      source,
    });
    if (ok) {
      handleClose();
    }
  };

  const handleNoChanges = async () => {
    if (!profile) return;
    const ok = await addCheckIn({
      weightKg: profile.weightKg,
      periodExperience,
      source: 'confirmation',
    });
    if (ok) {
      handleClose();
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-2xl">
        <RefreshCw size={20} className="text-accent flex-shrink-0" />
        <p className="text-sm font-body text-text-primary">
          Dame un dato breve y yo me ocupo de interpretarlo. No vas a ver gráficos ni comparaciones al guardar.
        </p>
      </div>

      <div>
        <Input
          label="Peso actual (kg)"
          type="number"
          value={newWeight ?? profile?.weightKg?.toString() ?? ''}
          onChange={(e) => setNewWeight(e.target.value)}
          placeholder={profile?.weightKg?.toString()}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-body font-medium text-text-primary">
          ¿Cómo sentiste este período? <span className="text-muted">(opcional)</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {EXPERIENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setPeriodExperience((current) =>
                  current === option.value ? undefined : option.value,
                )
              }
              className={clsx(
                'min-h-[44px] rounded-full px-3 py-2 text-sm font-body font-medium transition-colors',
                periodExperience === option.value
                  ? 'bg-[#226046] text-white'
                  : 'bg-[#edefe6] text-[#226046]',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {saveError && (
        <p className="rounded-2xl bg-[#fd9d1a]/10 p-3 text-sm text-[#895100]">
          {saveError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button variant="primary" onClick={handleQuickUpdate} loading={isSaving} fullWidth>
          Actualizar peso
        </Button>
        <Button variant="secondary" onClick={() => { handleClose(); onEditProfile(); }} disabled={isSaving} fullWidth>
          Editar perfil completo
        </Button>
        <Button variant="ghost" onClick={handleNoChanges} disabled={isSaving} fullWidth>
          Nada cambió, seguir así
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={handleClose} title="Check-in">
        {content}
      </BottomSheet>
      <Modal isOpen={isOpen} onClose={handleClose} title="Check-in">
        {content}
      </Modal>
    </>
  );
}
