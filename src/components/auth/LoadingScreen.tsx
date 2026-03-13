import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center animate-fade-in">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto">
          <span className="text-accent font-heading font-bold text-2xl">N</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-accent" />
          <p className="text-sm font-body text-muted">Conectando con GitHub...</p>
        </div>
      </div>
    </div>
  );
}
