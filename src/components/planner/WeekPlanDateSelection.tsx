import { useState } from 'react';
import { format } from 'date-fns';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { getDefaultPlanStartDate, getPlanningDayKeys, isValidPlanStartDate, parseDate, todayKey } from '../../utils/dateHelpers';

interface Props {
  initialDate: string;
  onClose: () => void;
  onConfirm: (startDate: string) => void;
  busy: boolean;
}

export function WeekPlanDateSelection({ initialDate, onClose, onConfirm, busy }: Props) {
  const [startDate, setStartDate] = useState(initialDate);
  const valid = isValidPlanStartDate(startDate);
  const dates = valid ? getPlanningDayKeys(startDate) : [];
  const content = (
    <form className="space-y-5" onSubmit={(event) => {
      event.preventDefault();
      if (valid && !busy) onConfirm(startDate);
    }}>
      <p className="text-sm text-[#40493d]">Armamos 7 días desde la fecha que elijas.</p>
      <div className="flex gap-2">
        <Button tone="journal" variant="secondary" type="button" onClick={() => setStartDate(todayKey())}>Desde hoy</Button>
        <Button tone="journal" variant="secondary" type="button" onClick={() => setStartDate(getDefaultPlanStartDate())}>Desde mañana</Button>
      </div>
      <label className="block text-sm font-medium text-[#191c17]">
        Fecha de inicio
        <input
          type="date"
          min={todayKey()}
          required
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          className="mt-2 block w-full min-h-[48px] rounded-xl border-0 bg-[#e8ebe3] px-3 text-[#191c17] focus:ring-2 focus:ring-[#226046]"
        />
      </label>
      <p className="text-sm text-[#226046]" aria-live="polite">
        {valid
          ? `Del ${format(parseDate(dates[0]), 'dd/MM/yyyy')} al ${format(parseDate(dates[6]), 'dd/MM/yyyy')}`
          : 'Elegí hoy o una fecha futura para empezar.'}
      </p>
      <Button tone="journal" type="submit" fullWidth disabled={!valid || busy}>Generar plan de 7 días</Button>
      <Button tone="journal" variant="secondary" type="button" fullWidth onClick={onClose}>Cancelar</Button>
    </form>
  );
  return (
    <>
      <BottomSheet isOpen onClose={onClose} title="¿Cuándo empezamos?" tone="journal">{content}</BottomSheet>
      <Modal isOpen onClose={onClose} title="¿Cuándo empezamos?" tone="journal">{content}</Modal>
    </>
  );
}
