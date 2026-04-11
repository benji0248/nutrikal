import { Droplets } from 'lucide-react';

export function HydrationCard() {
  const filled = 2;
  const total = 5;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0px_10px_20px_rgba(0,0,0,0.03)] flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Droplets className="text-blue-500" size={18} />
          <h4 className="font-bold text-sm uppercase tracking-tighter">Hidratación</h4>
        </div>
        <p className="text-2xl font-black text-[#191c17]">
          1.2L <span className="text-stone-400 font-medium text-base">/ 2.5L</span>
        </p>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-8 rounded-full ${i < filled ? 'bg-blue-500' : 'bg-blue-500/20'}`}
          />
        ))}
      </div>
    </div>
  );
}
