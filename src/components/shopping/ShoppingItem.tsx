import { clsx } from 'clsx';
import type { ShoppingItem as ShoppingItemType } from '../../types';

interface ShoppingItemProps {
  item: ShoppingItemType;
  onToggle: () => void;
}

export function ShoppingItemRow({ item, onToggle }: ShoppingItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 py-2.5 px-1 text-left transition-all"
    >
      <div
        className={clsx(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0',
          item.checked
            ? 'bg-green border-green'
            : 'border-border',
        )}
      >
        {item.checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx(
          'text-sm font-body transition-all',
          item.checked ? 'line-through text-muted' : 'text-text-primary',
        )}>
          {item.name}
        </p>
      </div>
      <span className={clsx(
        'text-xs font-body flex-shrink-0',
        item.checked ? 'text-muted/50' : 'text-muted',
      )}>
        {item.quantity}
      </span>
    </button>
  );
}
