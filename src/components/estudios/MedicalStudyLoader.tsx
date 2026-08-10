import { useEffect, useState } from 'react';
import type { MedicalStudyProcessingStage } from '../../types';
import { MEDICAL_STUDY_STAGE_MESSAGES } from '../../types';

const TOKENS = {
  surface: '#f8faf1',
  surfaceContainerLow: '#f3f5eb',
  primary: '#226046',
  onSurface: '#191c17',
  ambientShadow: '0px 20px 40px rgba(25, 28, 23, 0.06)',
} as const;

function JournalRingLoader() {
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = c * 0.22;
  return (
    <div className="h-20 w-20 animate-spin" style={{ animationDuration: '1.15s' }} aria-hidden>
      <svg width="100%" height="100%" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx={40} cy={40} r={r} fill="none" stroke={TOKENS.surfaceContainerLow} strokeWidth={7} strokeLinecap="round" />
        <circle cx={40} cy={40} r={r} fill="none" stroke={TOKENS.primary} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
      </svg>
    </div>
  );
}

interface MedicalStudyLoaderProps {
  stage: MedicalStudyProcessingStage;
}

export function MedicalStudyLoader({ stage }: MedicalStudyLoaderProps) {
  const messages = MEDICAL_STUDY_STAGE_MESSAGES[stage];
  const [tick, setTick] = useState(0);
  const messageIndex = messages.length <= 1 ? 0 : tick % messages.length;

  useEffect(() => {
    if (messages.length <= 1) return undefined;
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 2800);
    return () => clearInterval(timer);
  }, [stage, messages.length]);

  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center gap-10 px-6 py-12"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#f3f5eb] to-[#ecefe6]"
        style={{ boxShadow: TOKENS.ambientShadow }}
      >
        <span className="font-heading text-[2.25rem] font-bold leading-none tracking-tight text-[#226046]">N</span>
      </div>
      <JournalRingLoader />
      <p className="max-w-xs text-center font-body text-[15px] font-medium leading-relaxed text-[#191c17]/80">
        {messages[messageIndex]}
      </p>
    </div>
  );
}
