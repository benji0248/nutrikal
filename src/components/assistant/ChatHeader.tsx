import { Sparkles } from 'lucide-react';

export const ChatHeader = () => {
  return (
    <div className="sticky top-0 z-20 bg-surface border-b border-border/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-accent/15 flex items-center justify-center">
          <Sparkles size={18} className="text-accent" />
        </div>
        <div>
          <h2 className="text-sm font-heading font-bold text-text-primary">NutriKal</h2>
          <p className="text-[11px] font-body text-muted">Tu asistente de nutrición</p>
        </div>
      </div>
    </div>
  );
};
