import { clsx } from 'clsx';
import type { MedicalParameterFlag, MedicalStudyParameter } from '../../types';
import { formatParameterValue, sortParameters } from '../../utils/medicalStudyHelpers';

const FLAG_LABELS: Record<MedicalParameterFlag, string> = {
  normal: 'Normal',
  high: 'Alto',
  low: 'Bajo',
  critical: 'Crítico',
  unknown: '—',
};

const FLAG_CARD: Record<MedicalParameterFlag, string> = {
  normal: 'bg-white border-[#e7e9e0]',
  high: 'bg-amber-50 border-amber-200',
  low: 'bg-sky-50 border-sky-200',
  critical: 'bg-red-50 border-red-200',
  unknown: 'bg-[#fafbf7] border-[#e7e9e0]',
};

const FLAG_VALUE: Record<MedicalParameterFlag, string> = {
  normal: 'text-[#226046]',
  high: 'text-amber-800',
  low: 'text-sky-800',
  critical: 'text-red-700',
  unknown: 'text-[#5a6258]',
};

const FLAG_BADGE: Record<MedicalParameterFlag, string> = {
  normal: 'bg-[#226046]/10 text-[#226046]',
  high: 'bg-amber-200/80 text-amber-900',
  low: 'bg-sky-200/80 text-sky-900',
  critical: 'bg-red-200/80 text-red-900',
  unknown: 'bg-[#edefe6] text-[#707a6c]',
};

function ParameterCard({ param }: { param: MedicalStudyParameter }) {
  const flag = param.flag ?? 'unknown';

  return (
    <div
      className={clsx(
        'min-w-0 max-w-full overflow-hidden rounded-xl border px-3 py-2.5',
        FLAG_CARD[flag],
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 flex-1 break-words font-body text-sm font-semibold leading-snug text-[#191c17]">
          {param.parameterName}
        </p>
        <span
          className={clsx(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
            FLAG_BADGE[flag],
          )}
        >
          {FLAG_LABELS[flag]}
        </span>
      </div>

      {param.section && (
        <p className="mt-0.5 break-words font-body text-[10px] text-[#707a6c]">{param.section}</p>
      )}

      {param.referenceRange && (
        <p className="mt-1 break-words font-body text-[11px] leading-snug text-[#707a6c]">
          Ref: {param.referenceRange}
        </p>
      )}

      <p
        className={clsx(
          'mt-1.5 break-words text-right font-heading text-base font-bold leading-tight',
          FLAG_VALUE[flag],
        )}
      >
        {formatParameterValue(param)}
      </p>
    </div>
  );
}

interface MedicalStudyParameterGridProps {
  parameters: MedicalStudyParameter[];
}

export function MedicalStudyParameterGrid({ parameters }: MedicalStudyParameterGridProps) {
  const { abnormal, normal } = sortParameters(parameters);

  if (!parameters.length) {
    return <p className="font-body text-sm text-[#707a6c]">Todavía no hay parámetros estructurados.</p>;
  }

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      {abnormal.length > 0 && (
        <section className="min-w-0 max-w-full">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
            <h3 className="font-body text-sm font-bold text-amber-900">
              Fuera de rango ({abnormal.length})
            </h3>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            {abnormal.map((param) => (
              <ParameterCard key={param.id} param={param} />
            ))}
          </div>
        </section>
      )}

      {normal.length > 0 && (
        <section className="min-w-0 max-w-full">
          {abnormal.length > 0 && (
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#226046]" aria-hidden />
              <h3 className="font-body text-sm font-bold text-[#226046]">
                Dentro de rango ({normal.length})
              </h3>
            </div>
          )}
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {normal.map((param) => (
              <ParameterCard key={param.id} param={param} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
