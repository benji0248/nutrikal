import { CheckCircle } from 'lucide-react';

export const PlanAppliedView = () => {
  return (
    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
      <CheckCircle size={24} className="text-green-500 shrink-0" />
      <div>
        <p className="text-sm font-body font-medium text-text-primary">
          Plan aplicado al calendario
        </p>
        <p className="text-xs font-body text-muted mt-0.5">
          Los ingredientes se agregaron a tu lista de compras.
        </p>
      </div>
    </div>
  );
};
