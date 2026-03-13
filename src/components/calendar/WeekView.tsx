import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useState } from 'react';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useSwipe } from '../../hooks/useSwipe';
import { getWeekDays, navigateWeek, formatWeekRange, getWeekStart } from '../../utils/dateHelpers';
import { DayCard } from './DayCard';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function WeekView() {
  const currentDate = useCalendarStore((s) => s.currentDate);
  const setCurrentDate = useCalendarStore((s) => s.setCurrentDate);
  const saveWeekTemplate = useCalendarStore((s) => s.saveWeekTemplate);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const weekDays = getWeekDays(currentDate);

  const goNext = () => setCurrentDate(navigateWeek(currentDate, 'next'));
  const goPrev = () => setCurrentDate(navigateWeek(currentDate, 'prev'));

  const swipeBindings = useSwipe({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    saveWeekTemplate(templateName.trim(), getWeekStart(currentDate));
    setTemplateName('');
    setShowSaveTemplate(false);
  };

  return (
    <div {...swipeBindings}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="p-2 rounded-xl hover:bg-surface-elevated transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={20} className="text-text-secondary" />
          </button>
          <h2 className="text-sm font-display font-bold text-text-primary capitalize min-w-[160px] text-center">
            {formatWeekRange(currentDate)}
          </h2>
          <button
            onClick={goNext}
            className="p-2 rounded-xl hover:bg-surface-elevated transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Semana siguiente"
          >
            <ChevronRight size={20} className="text-text-secondary" />
          </button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Save size={14} />}
          onClick={() => setShowSaveTemplate(true)}
        >
          <span className="hidden sm:inline">Guardar plantilla</span>
        </Button>
      </div>

      <div className="space-y-4">
        {weekDays.map((day) => (
          <DayCard key={day} date={day} />
        ))}
      </div>

      <Modal
        isOpen={showSaveTemplate}
        onClose={() => {
          setShowSaveTemplate(false);
          setTemplateName('');
        }}
        title="Guardar plantilla de semana"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Guarda esta semana como plantilla para reutilizarla en el futuro.
          </p>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Nombre de la plantilla"
            className="w-full px-4 py-3 bg-surface-elevated rounded-xl text-sm text-text-primary placeholder-text-secondary border border-border focus:border-accent focus:ring-1 focus:ring-accent/50 outline-none transition-all min-h-[48px]"
            aria-label="Nombre de la plantilla"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSaveTemplate(false);
                setTemplateName('');
              }}
              fullWidth
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} fullWidth disabled={!templateName.trim()}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
