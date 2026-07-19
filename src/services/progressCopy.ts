import type {
  BodyCheckIn,
  Goal,
  ProgressReading,
} from '../types';
import { assessProgress } from './progressEngine';

function buildStateText(
  reading: Omit<ProgressReading, 'text' | 'insightId'>,
  goal: Goal,
  latest: BodyCheckIn | undefined,
): string {
  if (reading.freshness === 'stale') {
    return 'Hace un tiempo que no tenemos datos nuevos. Un check-in breve nos ayuda a saber si el plan sigue acompañándote bien.';
  }

  if (reading.state === 'insufficient_data') {
    return 'Aún es pronto para sacar conclusiones. Con el próximo check-in vamos a poder leer mejor cómo viene el proceso.';
  }

  if (latest?.periodExperience === 'hard') {
    if (reading.state === 'on_track') {
      return 'El plan parece estar funcionando, aunque este período se sintió difícil. Vale la pena cuidar que el próximo tramo sea más sostenible.';
    }
    return 'Este período se sintió difícil y todavía no hay una señal clara. Podemos priorizar que el plan sea más fácil de sostener.';
  }

  if (reading.state === 'on_track') {
    if (reading.confidence === 'high') {
      return 'Vemos una tendencia consistente alineada con tu objetivo.';
    }
    if (reading.confidence === 'medium') {
      return 'Todo indica que el plan está funcionando como esperábamos.';
    }
    return 'Parece que el proceso va en buena dirección, aunque todavía necesitamos más datos.';
  }

  if (reading.state === 'stable') {
    if (goal === 'maintain') {
      return reading.confidence === 'low'
        ? 'Parece que tu progreso se mantiene alineado con el objetivo.'
        : 'Todo indica que venís manteniendo un ritmo estable.';
    }
    return reading.confidence === 'low'
      ? 'Por ahora el proceso se ve estable. Todavía es pronto para recomendar cambios.'
      : 'Tu progreso viene estable. Podemos seguir observando antes de ajustar el plan.';
  }

  if (reading.state === 'goal_reached') {
    return 'Tu proceso está alineado con el objetivo que alcanzaste.';
  }

  return reading.confidence === 'low'
    ? 'Todavía no vemos una tendencia alineada, pero es pronto para recomendar cambios.'
    : 'La tendencia reciente no está alineada con el objetivo. Podemos revisar el próximo plan para acompañarte mejor.';
}

export function buildProgressReading(
  checkIns: BodyCheckIn[],
  goal: Goal,
  now = new Date(),
): ProgressReading {
  const assessment = assessProgress(checkIns, goal, now);
  const latestId = assessment.latestCheckIn?.id ?? 'none';
  const base = {
    state: assessment.state,
    freshness: assessment.freshness,
    confidence: assessment.confidence,
    currentWeightKg: assessment.currentWeightKg,
    deltaFromStartKg: assessment.deltaFromStartKg,
  };

  return {
    ...base,
    text: buildStateText(base, goal, assessment.latestCheckIn),
    insightId: [
      latestId,
      assessment.state,
      assessment.freshness,
      assessment.confidence,
    ].join(':'),
  };
}

export function formatProgressDetails(reading: ProgressReading): string {
  if (reading.currentWeightKg === undefined) {
    return 'Todavía no hay un check-in registrado.';
  }

  const weight = `${reading.currentWeightKg.toLocaleString('es-AR', {
    maximumFractionDigits: 1,
  })} kg`;

  if (
    reading.deltaFromStartKg === undefined ||
    reading.deltaFromStartKg === 0
  ) {
    return `${weight}\nSin cambios desde el primer check-in.`;
  }

  const sign = reading.deltaFromStartKg > 0 ? '+' : '';
  const delta = `${sign}${reading.deltaFromStartKg.toLocaleString('es-AR', {
    maximumFractionDigits: 1,
  })} kg desde el inicio`;
  return `${weight}\n${delta}`;
}
