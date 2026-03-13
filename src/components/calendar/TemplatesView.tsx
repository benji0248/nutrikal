import { useState } from 'react';
import { Trash2, Copy, CalendarCheck } from 'lucide-react';
import { useCalendarStore } from '../../store/useCalendarStore';
import { getWeekStart, formatWeekRange } from '../../utils/dateHelpers';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MEAL_TYPE_ORDER } from '../../types';
import type { WeekTemplate } from '../../types';

export function TemplatesView() {
  const weekTemplates = useCalendarStore((s) => s.weekTemplates);
  const deleteWeekTemplate = useCalendarStore((s) => s.deleteWeekTemplate);
  const applyWeekTemplate = useCalendarStore((s) => s.applyWeekTemplate);
  const currentDate = useCalendarStore((s) => s.currentDate);

  const [applyingTemplate, setApplyingTemplate] = useState<WeekTemplate | null>(null);
  const [applyMode, setApplyMode] = useState<'merge' | 'replace'>('merge');

  const handleApply = () => {
    if (!applyingTemplate) return;
    applyWeekTemplate(applyingTemplate.id, getWeekStart(currentDate), applyMode);
    setApplyingTemplate(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-display font-bold text-text-primary">Plantillas de semana</h2>
      <p className="text-sm text-text-secondary">
        Guarda semanas completas como plantillas y aplícalas a cualquier semana futura.
      </p>

      {weekTemplates.length === 0 ? (
        <div className="text-center py-12">
          <CalendarCheck size={48} className="mx-auto text-text-secondary/30 mb-3" />
          <p className="text-text-secondary text-sm">No hay plantillas guardadas</p>
          <p className="text-text-secondary/60 text-xs mt-1">
            Ve a la vista semanal y guarda una semana como plantilla
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {weekTemplates.map((template) => {
            const dayCount = Object.keys(template.days).length;
            const totalMeals = Object.values(template.days).reduce(
              (sum, day) =>
                sum +
                (day
                  ? MEAL_TYPE_ORDER.reduce((s, mt) => s + day.meals[mt].length, 0)
                  : 0),
              0,
            );

            return (
              <div
                key={template.id}
                className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 transition-all hover:border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-text-primary">{template.name}</h3>
                    <p className="text-xs text-text-secondary mt-1">
                      {dayCount} días &middot; {totalMeals} comidas
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(template.days).map(([idx, day]) => {
                        if (!day) return null;
                        const mealCount = MEAL_TYPE_ORDER.reduce(
                          (s, mt) => s + day.meals[mt].length,
                          0,
                        );
                        const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                        return (
                          <span
                            key={idx}
                            className="text-[10px] bg-surface px-2 py-0.5 rounded-md text-text-secondary"
                          >
                            {labels[Number(idx)] ?? idx}: {mealCount}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setApplyingTemplate(template)}
                      className="p-2 rounded-lg hover:bg-accent/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label={`Aplicar plantilla ${template.name}`}
                    >
                      <Copy size={16} className="text-accent" />
                    </button>
                    <button
                      onClick={() => deleteWeekTemplate(template.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label={`Eliminar plantilla ${template.name}`}
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!applyingTemplate}
        onClose={() => setApplyingTemplate(null)}
        title="Aplicar plantilla"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Aplicar <strong className="text-text-primary">{applyingTemplate?.name}</strong> a la semana actual ({formatWeekRange(currentDate)}).
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-accent/30 cursor-pointer transition-colors min-h-[48px]">
              <input
                type="radio"
                name="apply-mode"
                value="merge"
                checked={applyMode === 'merge'}
                onChange={() => setApplyMode('merge')}
                className="text-accent focus:ring-accent"
              />
              <div>
                <p className="text-sm text-text-primary font-medium">Combinar</p>
                <p className="text-xs text-text-secondary">Agrega las comidas sin borrar las existentes</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-accent/30 cursor-pointer transition-colors min-h-[48px]">
              <input
                type="radio"
                name="apply-mode"
                value="replace"
                checked={applyMode === 'replace'}
                onChange={() => setApplyMode('replace')}
                className="text-accent focus:ring-accent"
              />
              <div>
                <p className="text-sm text-text-primary font-medium">Reemplazar</p>
                <p className="text-xs text-text-secondary">Reemplaza toda la semana con la plantilla</p>
              </div>
            </label>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setApplyingTemplate(null)} fullWidth>
              Cancelar
            </Button>
            <Button onClick={handleApply} fullWidth>
              Aplicar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
