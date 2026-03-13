import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useProfileStore } from '../../store/useProfileStore';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';

interface ProfileRecalibrateProps {
  isOpen: boolean;
  onClose: () => void;
  onEditProfile: () => void;
}

export function ProfileRecalibrate({ isOpen, onClose, onEditProfile }: ProfileRecalibrateProps) {
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const markRecalibrated = useProfileStore((s) => s.markRecalibrated);
  const [newWeight, setNewWeight] = useState(profile?.weightKg?.toString() ?? '');

  const handleQuickUpdate = () => {
    const w = Number(newWeight);
    if (w > 0) {
      updateProfile({ weightKg: w });
    }
    markRecalibrated();
    onClose();
  };

  const handleNoChanges = () => {
    markRecalibrated();
    onClose();
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-accent/5 rounded-2xl">
        <RefreshCw size={20} className="text-accent flex-shrink-0" />
        <p className="text-sm font-body text-text-primary">
          Pasaron 30 días desde tu último check-in. Actualizá tus datos para mantener las sugerencias precisas.
        </p>
      </div>

      <div>
        <Input
          label="Peso actual (kg)"
          type="number"
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          placeholder={profile?.weightKg?.toString()}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="primary" onClick={handleQuickUpdate} fullWidth>
          Actualizar peso
        </Button>
        <Button variant="secondary" onClick={() => { onClose(); onEditProfile(); }} fullWidth>
          Editar perfil completo
        </Button>
        <Button variant="ghost" onClick={handleNoChanges} fullWidth>
          Nada cambió, seguir así
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Check-in mensual">
        {content}
      </BottomSheet>
      <Modal isOpen={isOpen} onClose={onClose} title="Check-in mensual">
        {content}
      </Modal>
    </>
  );
}
