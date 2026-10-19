import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Check, ChevronDown, MessageCircle, Sparkles } from 'lucide-react';

export type AssistantMode = 'classic' | 'beta';
const modes = [
  { value: 'classic', label: 'Chat actual', description: 'Tu asistente de siempre', icon: MessageCircle },
  { value: 'beta', label: 'Nuevo asistente', description: 'Conversación libre y propuestas', icon: Sparkles },
] as const;

export function AssistantModeSelect({ value, onChange, triggerRef }: {
  value: AssistantMode; onChange: (value: AssistantMode) => void; triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const selectedIndex = modes.findIndex((mode) => mode.value === value);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const root = useRef<HTMLDivElement>(null);
  const options = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  useEffect(() => { if (open) options.current[activeIndex]?.focus(); }, [open, activeIndex]);

  const show = (index = selectedIndex) => { setActiveIndex(index); setOpen(true); };
  const select = (index: number) => { setOpen(false); triggerRef.current?.focus(); onChange(modes[index].value); };
  const onListKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setActiveIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + modes.length) % modes.length);
    } else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setActiveIndex(event.key === 'Home' ? 0 : modes.length - 1); }
    else if (event.key.length === 1 && event.key !== ' ') {
      const index = modes.findIndex((mode) => mode.label.toLocaleLowerCase('es').startsWith(event.key.toLocaleLowerCase('es')));
      if (index >= 0) { event.preventDefault(); setActiveIndex(index); }
    }
  };
  return <div ref={root} className="relative min-w-0" onBlur={(event) => {
    if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={triggerRef} type="button" aria-label={`Elegir asistente: ${modes[selectedIndex].label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
      onClick={() => { if (open) setOpen(false); else show(); }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); }
        else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); show(event.key === 'Home' ? 0 : modes.length - 1); }
      }}
      className={`flex min-h-11 max-w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 ${open ? 'bg-surface2' : 'bg-transparent'}`}>
      <span className="truncate">{modes[selectedIndex].label}</span><ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-muted transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div id={listId} role="listbox" aria-label="Elegir asistente" onKeyDown={onListKeyDown} className="absolute left-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-[1.5rem] bg-surface p-2 shadow-ambient ring-1 ring-border">
      {modes.map((mode, index) => {
        const Icon = mode.icon;
        const selected = mode.value === value;
        return <button key={mode.value} ref={(node) => { options.current[index] = node; }} type="button" role="option" aria-selected={selected} tabIndex={-1} onFocus={() => setActiveIndex(index)} onClick={() => select(index)}
          className={`flex min-h-[76px] w-full items-center gap-3 rounded-2xl px-3 py-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/25 ${selected ? 'bg-surface2 text-accent' : 'text-text-primary hover:bg-surface2/60'}`}>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-accent/10 text-accent' : 'bg-surface2 text-muted'}`}><Icon size={19} strokeWidth={1.75} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{mode.label}</span><span className="mt-1 block text-[11px] leading-4 text-muted">{mode.description}</span></span>
          {selected && <Check size={17} strokeWidth={2} className="shrink-0 text-accent" aria-hidden="true" />}
        </button>;
      })}
    </div>}
  </div>;
}
