import { getMacroPercent } from '../../utils/macroHelpers';

const QUOTES = [
  'Nutrí tu cuerpo con intención, no con prisa.',
  'Cada comida es una oportunidad de cuidarte.',
  'La constancia vale más que la perfección.',
  'Tu energía empieza en el plato.',
];

interface DaySummaryCardProps {
  consumedKcal: number;
  budgetKcal: number;
  showCalories: boolean;
}

export function DaySummaryCard({ consumedKcal, budgetKcal, showCalories }: DaySummaryCardProps) {
  const quote = QUOTES[Math.abs(Math.floor(consumedKcal + budgetKcal)) % QUOTES.length];
  const remaining = Math.max(0, Math.round(budgetKcal - consumedKcal));
  const pct = getMacroPercent(consumedKcal, budgetKcal);

  if (!showCalories) {
    return (
      <div className="bg-[#226046] text-white p-8 rounded-3xl shadow-[0px_20px_40px_rgba(34,96,70,0.15)] flex flex-col justify-between overflow-hidden relative group h-full">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#b1f0ce] rounded-full opacity-20 group-hover:scale-110 transition-transform duration-700" />
        <div className="relative z-10 flex flex-col h-full">
          <p className="text-[#b1f0ce] font-bold text-sm uppercase tracking-widest mb-4">Resumen del Día</p>
          <h3 className="text-3xl font-bold leading-tight mb-8 italic">"{quote}"</h3>
          <div className="mt-auto">
             <p className="text-xs opacity-75">Activa "Mostrar calorías" para ver tu energía.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#226046] text-white p-8 rounded-3xl shadow-[0px_20px_40px_rgba(34,96,70,0.15)] flex flex-col justify-between overflow-hidden relative group h-full">
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#b1f0ce] rounded-full opacity-20 group-hover:scale-110 transition-transform duration-700" />
      <div className="relative z-10 flex flex-col h-full">
        <p className="text-[#b1f0ce] font-bold text-sm uppercase tracking-widest mb-4">Resumen del Día</p>
        <h3 className="text-3xl font-bold leading-tight mb-8 italic">"{quote}"</h3>
        <div className="space-y-6 mt-auto">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-5xl font-extrabold tracking-tighter">{remaining.toLocaleString('es-AR')}</span>
              <span className="text-[#b1f0ce] font-medium ml-1">kcal restantes</span>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#b1f0ce]/30 border-t-[#b1f0ce] flex items-center justify-center shrink-0" style={{ transform: `rotate(${(pct / 100) * 360}deg)` }}>
              <span className="text-xs font-bold" style={{ transform: `rotate(-${(pct / 100) * 360}deg)` }}>{pct}%</span>
            </div>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#b1f0ce] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
