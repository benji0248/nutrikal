import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useSwipe } from '../../hooks/useSwipe';
import { getWeekDays, getWeekRange, parseDate, isToday, DAY_LABELS, formatDateKey } from '../../utils/dateHelpers';
import { DayCard } from './DayCard';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { format } from 'date-fns';

export function WeekView() {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const navWeek = useCalendarStore((s) => s.navigateWeek);
  const saveTemplate = useCalendarStore((s) => s.saveWeekAsTemplate);

  const weekDays = useMemo(() => getWeekDays(parseDate(currentDate)), [currentDate]);

  const [activeDayIdx, setActiveDayIdx] = useState(() => {
    const todayIdx = weekDays.findIndex((d) => isToday(d));
    return todayIdx >= 0 ? todayIdx : 0;
  });
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const swipeBindings = useSwipe({
    onSwipeLeft: () => {
      if (activeDayIdx < 6) setActiveDayIdx(activeDayIdx + 1);
      else navWeek('next');
    },
    onSwipeRight: () => {
      if (activeDayIdx > 0) setActiveDayIdx(activeDayIdx - 1);
      else navWeek('prev');
    },
  });

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    saveTemplate(templateName.trim());
    setTemplateName('');
    setShowSaveTemplate(false);
  };

  const templateForm = (
    <div className="space-y-4">
      <p className="text-sm text-muted font-body">
        Guardá esta semana como plantilla para reutilizarla.
      </p>
      <Input
        label="Nombre"
        value={templateName}
        onChange={(e) => setTemplateName(e.target.value)}
        placeholder="Ej: Semana alta en proteínas"
        onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
      />
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setShowSaveTemplate(false)} fullWidth>Cancelar</Button>
        <Button onClick={handleSaveTemplate} fullWidth disabled={!templateName.trim()}>Guardar</Button>
      </div>
    </div>
  );

  return (
    <div {...swipeBindings}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navWeek('prev')}
            className="p-2 rounded-xl hover:bg-surface2 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={20} className="text-muted" />
          </button>
          <h2 className="text-sm font-heading font-bold text-text-primary capitalize min-w-[140px] text-center">
            {getWeekRange(currentDate)}
          </h2>
          <button
            onClick={() => navWeek('next')}
            className="p-2 rounded-xl hover:bg-surface2 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={20} className="text-muted" />
          </button>
        </div>
        <Button variant="ghost" size="sm" icon={<Save size={14} />} onClick={() => setShowSaveTemplate(true)}>
          <span className="hidden sm:inline">Plantilla</span>
        </Button>
      </div>

      {/* Day tabs — mobile only */}
      <div className="flex gap-1 mb-4 md:hidden">
        {weekDays.map((day, idx) => {
          const active = idx === activeDayIdx;
          const today = isToday(day);
          return (
            <button
              key={formatDateKey(day)}
              onClick={() => setActiveDayIdx(idx)}
              className={clsx(
                'flex-1 flex flex-col items-center py-2 rounded-xl transition-all min-h-[48px]',
                active ? 'bg-accent/10' : 'hover:bg-surface2/50',
              )}
              aria-label={`${DAY_LABELS[idx]} ${format(day, 'd')}`}
            >
              <span className={clsx('text-[10px] font-body', active ? 'text-accent font-medium' : 'text-muted')}>
                {DAY_LABELS[idx]}
              </span>
              <span className={clsx(
                'text-sm font-mono mt-0.5',
                today ? 'text-accent font-bold' : active ? 'text-text-primary' : 'text-muted',
              )}>
                {format(day, 'd')}
              </span>
              {active && <div className="w-1 h-1 rounded-full bg-accent mt-1" />}
            </button>
          );
        })}
      </div>

      {/* Mobile: single day */}
      <div className="md:hidden">
        <DayCard date={weekDays[activeDayIdx]} />
      </div>

      {/* Desktop: all days */}
      <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-4">
        {weekDays.map((day) => (
          <DayCard key={formatDateKey(day)} date={day} />
        ))}
      </div>

      <BottomSheet isOpen={showSaveTemplate} onClose={() => setShowSaveTemplate(false)} title="Guardar plantilla">
        {templateForm}
      </BottomSheet>
      <Modal isOpen={showSaveTemplate} onClose={() => setShowSaveTemplate(false)} title="Guardar plantilla">
        {templateForm}
      </Modal>
    </div>
  );
}
