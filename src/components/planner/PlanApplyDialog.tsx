import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Modal } from '../ui/Modal';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { useCalendarPlanStore } from '../../store/useCalendarPlanStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { describePlanOverlap, shiftWeekPlan, nextAvailablePlanStart, isWholeWeekShift } from '../../services/calendarPlanService';
import { isValidPlanStartDate, parseDate, todayKey } from '../../utils/dateHelpers';
import type { OverlapPolicy } from '../../services/calendarPlanTypes';

export function PlanApplyDialog() {
  const pending = useCalendarPlanStore((s) => s.pendingPlan);
  return pending ? <ApplySelection key={pending.plan.id} pending={pending} /> : null;
}

function ApplySelection({ pending }: { pending: NonNullable<ReturnType<typeof useCalendarPlanStore.getState>['pendingPlan']> }) {
  const [startDate, setStartDate] = useState(() => {
    const date = pending.plan.days[0]?.date;
    return date && isValidPlanStartDate(date) ? date : nextAvailablePlanStart(pending.plan, todayKey());
  });
  const [policy, setPolicy] = useState<OverlapPolicy>('fill');
  const [loaded, setLoaded] = useState(false);
  const snapshot = useCalendarPlanStore((s) => s.snapshot);
  const busy = useCalendarPlanStore((s) => s.busy);
  const error = useCalendarPlanStore((s) => s.error);
  const close = useCalendarPlanStore((s) => s.closeApply);
  const submitting = useRef(false);
  const shifted = isValidPlanStartDate(startDate) && isWholeWeekShift(pending.plan, startDate) ? shiftWeekPlan(pending.plan, startDate) : null;
  const overlap = shifted && snapshot ? describePlanOverlap(shifted, snapshot.meals, todayKey()) : null;
  const apply = async (date: string, selectedPolicy: OverlapPolicy) => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await useCalendarPlanStore.getState().perform({ kind: 'apply', plan: pending.plan, planId: pending.plan.id!, policy: selectedPolicy, startDate: date }, 'Plan agregado');
      const applied = result.plans.find((plan) => plan.id === pending.plan.id)?.source;
      useCalendarPlanStore.setState({ pendingPlan: null });
      useCalendarStore.getState().setCurrentDate(date);
      useCalendarStore.getState().setView('week');
      if (applied) pending.onApplied(applied, result);
    } catch { /* Error is shown by the shared store. */ }
    finally { submitting.current = false; }
  };
  useEffect(() => {
    let cancelled = false;
    useCalendarPlanStore.getState().refresh().then((current) => {
      if (cancelled) return;
      setLoaded(true);
      const originalStart = pending.plan.days[0]?.date;
      if (originalStart && isValidPlanStartDate(originalStart)) {
        const report = describePlanOverlap(pending.plan, current.meals, todayKey());
        if (!report.conflicts && !report.protected && report.empty > 0) void apply(originalStart, 'fill');
      }
    }).catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
    // The selected plan defines this preparation; later date changes require explicit confirmation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);
  const disabled = busy || !loaded || !overlap || (policy === 'fill' && overlap.empty === 0)
    || (policy !== 'fill' && overlap.empty + overlap.conflicts === 0);
  const content = (
    <div className="space-y-4">
      {!loaded || busy ? <p className="text-sm text-[#40493d]">{busy ? 'Guardando calendario y compras…' : 'Revisando las fechas de tu calendario…'}</p> : null}
      {overlap && <p className="text-sm text-[#40493d]">{overlap.conflicts ? `Ya tenés comidas en ${overlap.conflicts} horarios de ${overlap.days.length} días.` : 'No hay superposiciones en estas fechas.'} Hay {overlap.empty} horarios vacíos en este plan.</p>}
      {!!overlap?.protected && <p className="text-sm text-[#40493d]">Se conservan {overlap.protected} horarios con comidas realizadas o fechas pasadas.</p>}
      <label className="block text-sm font-medium text-[#191c17]">Fecha de inicio
        <input type="date" min={nextAvailablePlanStart(pending.plan, todayKey())} step={7} value={startDate} disabled={busy} onChange={(event) => setStartDate(event.target.value)} className="mt-2 min-h-[48px] w-full rounded-xl border-0 bg-[#e8ebe3] px-3" />
      </label>
      <p className="text-xs text-[#40493d]">Podés pasarlo a otra semana manteniendo el día de inicio y tu rutina. Para empezar otro día, generá un plan nuevo.</p>
      {!shifted && <p role="alert" className="text-sm text-red-700">Elegí una fecha futura con el mismo día de la semana que el plan original.</p>}
      {shifted && <p className="text-sm text-[#226046]">Del {format(parseDate(shifted.days[0].date), 'dd/MM/yyyy')} al {format(parseDate(shifted.days[6].date), 'dd/MM/yyyy')}</p>}
      <fieldset disabled={busy} className="space-y-3">
        <legend className="mb-2 text-sm font-medium text-[#191c17]">¿Cómo querés agregarlo?</legend>
        {([
          ['fill', 'Completar espacios vacíos', 'Conserva tus comidas actuales.'],
          ['replace', 'Reemplazar comidas planificadas', 'Cambia solo los horarios incluidos en este plan. Podés deshacerlo.'],
          ['alternatives', 'Guardar como alternativas', 'Conserva la opción elegida; las alternativas no se suman a calorías ni compras.'],
        ] as const).map(([value, label, description]) => <label key={value} className="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl bg-[#f3f5eb] p-3">
          <input type="radio" name="overlap-policy" value={value} checked={policy === value} onChange={() => setPolicy(value)} className="mt-1 accent-[#226046]" />
          <span><span className="block text-sm font-medium text-[#191c17]">{label}</span><span className="block text-xs text-[#40493d]">{description}</span></span>
        </label>)}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {loaded && !snapshot && <Button tone="journal" variant="secondary" onClick={() => { setLoaded(false); void useCalendarPlanStore.getState().refresh().catch(() => {}).finally(() => setLoaded(true)); }}>Reintentar</Button>}
      <Button tone="journal" fullWidth disabled={disabled} onClick={() => void apply(startDate, policy)}>
        {policy === 'fill' ? `Completar ${overlap?.empty ?? 0} horarios vacíos` : policy === 'replace' ? 'Reemplazar y agregar al calendario' : 'Guardar opciones en el calendario'}
      </Button>
      <Button tone="journal" variant="secondary" fullWidth disabled={busy} onClick={close}>Cancelar</Button>
    </div>
  );
  return <><BottomSheet isOpen onClose={close} title="Agregar plan al calendario" tone="journal">{content}</BottomSheet><Modal isOpen onClose={close} title="Agregar plan al calendario" tone="journal">{content}</Modal></>;
}
