import { useState } from 'react';
import { Plus, Trash2, Dumbbell } from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore';
import { todayKey } from '../../utils/dateHelpers';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ActivityLogProps {
  date?: string;
}

export function ActivityLog({ date }: ActivityLogProps) {
  const dateKey = date ?? todayKey();
  const activities = useProfileStore((s) => s.getActivitiesForDate(dateKey));
  const addActivity = useProfileStore((s) => s.addActivity);
  const removeActivity = useProfileStore((s) => s.removeActivity);

  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState('');
  const [duration, setDuration] = useState('');

  const handleAdd = () => {
    if (!desc.trim() || !duration) return;
    // Rough estimate: ~5 cal/min for moderate exercise
    const caloriesBurned = Math.round(Number(duration) * 5);
    addActivity({
      date: dateKey,
      description: desc.trim(),
      durationMinutes: Number(duration),
      caloriesBurned,
    });
    setDesc('');
    setDuration('');
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell size={16} className="text-accent" />
          <p className="text-sm font-body font-medium text-text-primary">Actividad</p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="p-1.5 rounded-lg hover:bg-surface2 transition-colors"
          >
            <Plus size={16} className="text-muted" />
          </button>
        )}
      </div>

      {activities.length === 0 && !adding && (
        <p className="text-xs font-body text-muted">Sin actividad registrada hoy</p>
      )}

      {activities.map((a) => (
        <div key={a.id} className="flex items-center justify-between p-3 bg-surface2/30 rounded-xl">
          <div>
            <p className="text-sm font-body text-text-primary">{a.description}</p>
            <p className="text-xs font-body text-muted">{a.durationMinutes} min</p>
          </div>
          <button
            type="button"
            onClick={() => removeActivity(a.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {adding && (
        <div className="space-y-2 p-3 bg-surface2/20 rounded-2xl border border-border/40">
          <Input placeholder="Qué hiciste? (ej: Correr)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Input placeholder="Duración (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleAdd} disabled={!desc.trim() || !duration}>
              Agregar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
