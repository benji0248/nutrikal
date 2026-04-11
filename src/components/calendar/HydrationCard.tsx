import { Droplets } from 'lucide-react';

/** Placeholder visual — registro de agua pendiente de producto */
export function HydrationCard() {
  const filled = 3;
  const total = 5;

  return (
    <div className="rounded-[1.5rem] bg-surface p-4 shadow-ambient flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface2 text-accent">
        <Droplets size={22} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted">Hidratación</p>
        <p className="text-sm font-body font-medium text-text-primary mt-0.5">Seguí tu ingesta de agua</p>
        <div className="flex gap-1 mt-2">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full ${i < filled ? 'bg-sky-400/80' : 'bg-border/50'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
