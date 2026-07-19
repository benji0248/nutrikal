import { useState } from 'react';
import { ChevronDown, ChevronUp, Scale } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import { useProgressStore } from '../../store/useProgressStore';
import { buildProgressReading, formatProgressDetails } from '../../services/progressCopy';
import { Button } from '../ui/Button';

interface ProgressOverviewProps {
  onAddCheckIn: () => void;
}

export function ProgressOverview({ onAddCheckIn }: ProgressOverviewProps) {
  const profile = useProfileStore((state) => state.profile);
  const checkIns = useProgressStore((state) => state.checkIns);
  const [showDetails, setShowDetails] = useState(false);

  if (!profile) return null;

  const reading = buildProgressReading(checkIns, profile.goal);
  const hasData = reading.currentWeightKg !== undefined;

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] bg-[#f3f5eb] p-5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#226046]/10 text-[#226046]">
          <Scale size={22} />
        </div>
        <p className="font-heading text-xl font-bold leading-snug text-[#191c17]">
          {reading.text}
        </p>
        <p className="mt-2 font-body text-sm text-[#707a6c]">
          NutriKal interpreta tus check-ins sin convertirlos en una nota o una racha.
        </p>
      </div>

      {hasData && (
        <div>
          <button
            type="button"
            onClick={() => setShowDetails((value) => !value)}
            className="flex min-h-[48px] w-full items-center justify-between rounded-2xl bg-[#edefe6] px-4 py-3 text-left font-body text-sm font-semibold text-[#226046]"
          >
            Ver detalles
            {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showDetails && (
            <p className="mt-3 whitespace-pre-line rounded-2xl bg-[#ffffff] p-4 font-body text-sm leading-relaxed text-[#40493d]">
              {formatProgressDetails(reading)}
            </p>
          )}
        </div>
      )}

      <Button type="button" tone="journal" fullWidth onClick={onAddCheckIn}>
        Registrar check-in
      </Button>
    </div>
  );
}
