import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import type { MedicalStudyProcessingStage, MedicalStudyStatus } from '../../types';

const STEPS: { key: MedicalStudyProcessingStage | 'done'; label: string }[] = [
  { key: 'upload', label: 'Guardado' },
  { key: 'extract', label: 'Lectura' },
  { key: 'structure', label: 'Análisis' },
  { key: 'explain', label: 'Explicación' },
  { key: 'done', label: 'Listo' },
];

function stepIndexForStatus(status: MedicalStudyStatus, explainPending?: boolean): number {
  switch (status) {
    case 'uploaded':
      return 0;
    case 'extracting':
      return 1;
    case 'extracted':
      return 2;
    case 'structuring':
      return 2;
    case 'structured':
      return explainPending ? 3 : 4;
    case 'explaining':
      return 3;
    case 'completed':
      return 4;
    case 'failed':
      return -1;
    default:
      return 0;
  }
}

interface MedicalStudyProcessingStepperProps {
  status: MedicalStudyStatus;
  compact?: boolean;
  explainPending?: boolean;
}

export function MedicalStudyProcessingStepper({
  status,
  compact,
  explainPending,
}: MedicalStudyProcessingStepperProps) {
  const activeIdx = stepIndexForStatus(status, explainPending);
  if (status === 'completed' && !compact) return null;

  return (
    <ol
      className={clsx(
        'flex gap-1',
        compact ? 'flex-wrap' : 'justify-between',
      )}
      aria-label="Progreso del análisis"
    >
      {STEPS.map((step, idx) => {
        const done = activeIdx >= 0 && idx < activeIdx;
        const active = idx === activeIdx;
        const failed = status === 'failed' && idx === Math.max(activeIdx, 0);

        return (
          <li
            key={step.key}
            className={clsx(
              'flex items-center gap-1 rounded-full px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-wide',
              done && 'bg-[#226046]/10 text-[#226046]',
              active && !failed && 'bg-[#226046] text-white',
              !done && !active && 'bg-[#edefe6] text-[#707a6c]',
              failed && active && 'bg-red-100 text-red-700',
              compact && 'shrink-0',
            )}
          >
            {done ? <Check size={10} strokeWidth={3} /> : null}
            {!compact && <span>{step.label}</span>}
            {compact && active ? <span>{step.label}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
