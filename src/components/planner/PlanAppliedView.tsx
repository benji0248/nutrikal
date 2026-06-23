import { CheckCircle } from 'lucide-react';
import { JOURNAL } from '../assistant/journalTokens';

export const PlanAppliedView = () => {
  return (
    <div
      className="flex animate-fade-in items-center gap-3 rounded-[1.25rem] p-4"
      style={{
        backgroundColor: 'rgba(34, 96, 70, 0.1)',
        boxShadow: JOURNAL.ambientShadow,
      }}
    >
      <CheckCircle size={24} className="shrink-0" style={{ color: JOURNAL.primary }} />
      <div>
        <p className="font-body text-sm font-medium" style={{ color: JOURNAL.onSurface }}>
          Plan aplicado al calendario
        </p>
        <p className="mt-0.5 font-body text-xs" style={{ color: JOURNAL.muted }}>
          Los ingredientes se agregaron a tu lista de compras.
        </p>
      </div>
    </div>
  );
};
