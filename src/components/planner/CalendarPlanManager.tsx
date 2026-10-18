import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useCalendarPlanStore } from '../../store/useCalendarPlanStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { describePlanOverlap, shiftWeekPlan } from '../../services/calendarPlanService';
import type { CalendarPlan, OverlapPolicy } from '../../services/calendarPlanTypes';
import { navigateWeek, parseDate, todayKey } from '../../utils/dateHelpers';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { BottomSheet } from '../ui/BottomSheet';

const labelDate = (date: string) => format(parseDate(date), 'dd/MM/yyyy');
export function CalendarPlanManager({ visible = true }: { visible?: boolean }) {
  const snapshot = useCalendarPlanStore((s) => s.snapshot);
  const last = useCalendarPlanStore((s) => s.lastOperation);
  const busy = useCalendarPlanStore((s) => s.busy);
  const error = useCalendarPlanStore((s) => s.error);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarPlan | null>(null);
  return <>
    {last && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#e0f2e8] p-3 text-[#174830]" role="status">
      <span className="text-sm">{last.label}. Calendario y compras guardados.</span>
      <Button tone="journal" variant="secondary" disabled={busy} onClick={() => void useCalendarPlanStore.getState().undo().catch(() => {})}>Deshacer</Button>
    </div>}
    {error && !open && !selected && !useCalendarPlanStore.getState().pendingPlan && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
    {visible && <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-text-primary">{snapshot?.plans.length ? `${snapshot.plans.length} planes guardados` : 'Tus comidas y planes'}</p>
      <Button tone="journal" variant="secondary" disabled={busy} onClick={() => { setOpen(true); void useCalendarPlanStore.getState().refresh().catch(() => {}); }}>Administrar planes</Button>
    </div>}
    {open && <PlanList onClose={() => setOpen(false)} onSelect={(plan) => { setSelected(plan); setOpen(false); }} />}
    {selected && <PlanManagement key={selected.id} plan={selected} onClose={() => setSelected(null)} />}
  </>;
}
function PlanList({ onClose, onSelect }: { onClose: () => void; onSelect: (plan: CalendarPlan) => void }) {
  const snapshot = useCalendarPlanStore((s) => s.snapshot);
  const error = useCalendarPlanStore((s) => s.error);
  const content = <div className="space-y-3">
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {snapshot?.plans.map((plan) => <button key={plan.id} type="button" onClick={() => onSelect(plan)} className="block min-h-[48px] w-full rounded-xl bg-[#e8ebe3] p-4 text-left text-[#191c17]">
      <span className="block font-medium">{plan.title}</span><span className="text-sm">{labelDate(plan.startDate)} — {labelDate(plan.endDate)} · Administrar</span>
    </button>)}
    {!snapshot?.plans.length && <p className="text-sm text-[#40493d]">Los planes que agregues desde ahora aparecerán acá. Las comidas anteriores siguen disponibles para editar o eliminar individualmente en el calendario.</p>}
    <Button tone="journal" variant="secondary" fullWidth onClick={onClose}>Cerrar</Button>
  </div>;
  return <><BottomSheet isOpen title="Planes del calendario" onClose={onClose} tone="journal">{content}</BottomSheet><Modal isOpen title="Planes del calendario" onClose={onClose} tone="journal">{content}</Modal></>;
}
function PlanManagement({ plan, onClose }: { plan: CalendarPlan; onClose: () => void }) {
  const [action, setAction] = useState<'move' | 'remove' | null>(null);
  const [startDate, setStartDate] = useState(() => {
    let date = navigateWeek(plan.startDate, 'next');
    while (date < todayKey()) date = navigateWeek(date, 'next');
    return date;
  });
  const [policy, setPolicy] = useState<OverlapPolicy>('fill');
  const snapshot = useCalendarPlanStore((s) => s.snapshot);
  const busy = useCalendarPlanStore((s) => s.busy);
  const error = useCalendarPlanStore((s) => s.error);
  useEffect(() => { void useCalendarPlanStore.getState().refresh().catch(() => {}); }, []);
  const future = snapshot?.meals.filter((meal) => meal.planId === plan.id && !meal.completed && meal.date >= todayKey()) ?? [];
  const movablePreview = { ...plan.source, days: plan.source.days.map((day) => ({ ...day,
    meals: Object.fromEntries(future.filter((meal) => meal.date === day.date && !meal.isAlternative).map((meal) => [meal.mealType, { name: meal.name, totalKcal: meal.calories ?? 0, ingredients: meal.aiIngredients ?? [] }])),
  })) };
  const destination = shiftWeekPlan(movablePreview, startDate);
  const overlap = snapshot ? describePlanOverlap(destination, snapshot.meals.filter((meal) => !future.some((row) => row.id === meal.id)), todayKey()) : null;
  let previousWeek = navigateWeek(startDate, 'prev');
  if (previousWeek === plan.startDate) previousWeek = navigateWeek(previousWeek, 'prev');
  let nextWeek = navigateWeek(startDate, 'next');
  if (nextWeek === plan.startDate) nextWeek = navigateWeek(nextWeek, 'next');
  const confirm = async () => {
    try {
      if (action === 'remove') await useCalendarPlanStore.getState().perform({ kind: 'remove', planId: plan.id }, 'Comidas futuras del plan retiradas');
      if (action === 'move') {
        await useCalendarPlanStore.getState().perform({ kind: 'move', planId: plan.id, startDate, policy }, 'Plan movido');
        useCalendarStore.getState().setCurrentDate(startDate);
      }
      onClose();
    } catch { /* Error remains visible for the user. */ }
  };
  const close = () => { if (!busy) onClose(); };
  const content = <div className="space-y-4">
    <p className="text-sm text-[#40493d]">{labelDate(plan.startDate)} — {labelDate(plan.endDate)} · {future.length} comidas futuras disponibles.</p>
    <p className="text-sm text-[#40493d]">Las comidas realizadas y las fechas pasadas se conservan. Las comidas manuales solo se reemplazan si elegís esa opción en el destino.</p>
    {!action && <div className="space-y-2"><Button tone="journal" fullWidth disabled={!future.length || busy} onClick={() => setAction('move')}>Mover a otra semana</Button><Button tone="journal" variant="secondary" fullWidth disabled={!future.length || busy} onClick={() => setAction('remove')}>Quitar del calendario</Button></div>}
    {action === 'remove' && <p className="text-sm font-medium text-[#191c17]">Se quitarán {future.length} comidas futuras de este plan y se actualizarán sus compras. Podés deshacer este cambio.</p>}
    {action === 'move' && <>
      <div className="flex flex-wrap items-center gap-2"><Button tone="journal" variant="secondary" disabled={busy || previousWeek < todayKey()} onClick={() => setStartDate(previousWeek)}>Semana anterior</Button><Button tone="journal" variant="secondary" disabled={busy} onClick={() => setStartDate(nextWeek)}>Semana siguiente</Button></div>
      <p className="text-sm font-medium text-[#226046]">Destino: {labelDate(startDate)} — {labelDate(destination.days[6].date)}</p>
      <p className="text-sm text-[#40493d]">Se conserva el día de inicio para respetar tu rutina semanal.</p>
      {!!overlap?.conflicts && <label className="block text-sm text-[#191c17]">Hay {overlap.conflicts} horarios ocupados en el destino.
        <select value={policy} disabled={busy} onChange={(event) => setPolicy(event.target.value as OverlapPolicy)} className="mt-2 min-h-[48px] w-full rounded-xl border-0 bg-[#e8ebe3] px-3"><option value="fill">Elegí otra semana para conservar todo</option><option value="replace">Reemplazar comidas del destino</option><option value="alternatives">Guardar como alternativas en el destino</option></select>
      </label>}
      {!!overlap?.protected && <p className="text-sm text-[#40493d]">El destino incluye comidas realizadas. Elegí otra semana.</p>}
    </>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {action && <Button tone="journal" fullWidth disabled={busy || !future.length || (action === 'move' && (!!overlap?.protected || (policy === 'fill' && !!overlap?.conflicts)))} onClick={() => void confirm()}>{busy ? 'Guardando…' : action === 'remove' ? `Quitar ${future.length} comidas futuras` : 'Confirmar cambio de semana'}</Button>}
    <Button tone="journal" variant="secondary" fullWidth disabled={busy} onClick={close}>Cancelar</Button>
  </div>;
  return <><BottomSheet isOpen title="Administrar plan" onClose={close} tone="journal">{content}</BottomSheet><Modal isOpen title="Administrar plan" onClose={close} tone="journal">{content}</Modal></>;
}
