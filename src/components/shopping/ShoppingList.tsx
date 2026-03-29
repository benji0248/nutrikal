import { useState, useMemo } from 'react';
import { ShoppingCart, ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import type { ShoppingSection } from '../../types';
import { SHOPPING_SECTION_LABELS } from '../../types';
import { useShoppingStore } from '../../store/useShoppingStore';
import { useCalendarStore } from '../../store/useCalendarStore';
import { useIngredientsStore } from '../../store/useIngredientsStore';
import { INGREDIENTS_DB } from '../../data/ingredients';
import { useRecipesStore } from '../../store/useRecipesStore';
import { generateShoppingList } from '../../services/shoppingService';
import { todayKey, getWeekDayKeys } from '../../utils/dateHelpers';
import { ShoppingItemRow } from './ShoppingItem';
import { ShoppingExport } from './ShoppingExport';
import { Button } from '../ui/Button';

export function ShoppingListView() {
  const lists = useShoppingStore((s) => s.lists);
  const addList = useShoppingStore((s) => s.addList);
  const removeList = useShoppingStore((s) => s.removeList);
  const toggleItem = useShoppingStore((s) => s.toggleItem);
  const dayPlans = useCalendarStore((s) => s.dayPlans);
  const customIngredients = useIngredientsStore((s) => s.customIngredients);
  const customDishes = useRecipesStore((s) => s.customDishes);
  const allIngredients = useMemo(() => [...INGREDIENTS_DB, ...customIngredients], [customIngredients]);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGenerateWeek = () => {
    const weekKeys = getWeekDayKeys(todayKey());
    const from = weekKeys[0];
    const to = weekKeys[weekKeys.length - 1];
    const list = generateShoppingList(
      dayPlans,
      customDishes,
      allIngredients,
      from,
      to,
      `Semana del ${from.slice(8)}/${from.slice(5, 7)}`,
    );
    if (list.items.length > 0) {
      addList(list);
    }
  };

  if (lists.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center mx-auto">
            <ShoppingCart size={28} className="text-accent" />
          </div>
          <h2 className="text-xl font-heading font-bold text-text-primary">Lista de compras</h2>
          <p className="text-sm font-body text-muted max-w-xs mx-auto">
            Generá una lista a partir de las comidas planificadas en tu calendario.
          </p>
          <Button variant="primary" icon={<Plus size={18} />} onClick={handleGenerateWeek}>
            Generar para esta semana
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-text-primary">Compras</h2>
        <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={handleGenerateWeek}>
          Nueva lista
        </Button>
      </div>

      {lists.map((list) => {
        const total = list.items.length;
        const checked = list.items.filter((i) => i.checked).length;
        const progress = total > 0 ? Math.round((checked / total) * 100) : 0;

        // Group items by section
        const sections = new Map<ShoppingSection, typeof list.items>();
        for (const item of list.items) {
          const group = sections.get(item.section) || [];
          group.push(item);
          sections.set(item.section, group);
        }

        return (
          <div key={list.id} className="bg-surface2/20 rounded-3xl border border-border/40 overflow-hidden">
            {/* Header */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-bold text-text-primary">{list.name}</h3>
                <div className="flex items-center gap-2">
                  <ShoppingExport list={list} />
                  <button
                    type="button"
                    onClick={() => removeList(list.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {/* Progress */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] font-body text-muted">{checked}/{total}</span>
              </div>
            </div>

            {/* Sections */}
            {[...sections.entries()].map(([section, items]) => {
              const sectionKey = `${list.id}-${section}`;
              const collapsed = collapsedSections.has(sectionKey);
              const sectionChecked = items.filter((i) => i.checked).length;

              return (
                <div key={sectionKey} className="border-t border-border/20">
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-surface2/30 transition-colors"
                  >
                    <span className="text-xs font-body font-medium text-text-primary">
                      {SHOPPING_SECTION_LABELS[section]}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-body text-muted">{sectionChecked}/{items.length}</span>
                      {collapsed ? <ChevronRight size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                    </div>
                  </button>
                  {!collapsed && (
                    <div className="px-4 pb-2">
                      {items.map((item) => (
                        <ShoppingItemRow
                          key={item.id}
                          item={item}
                          onToggle={() => toggleItem(list.id, item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
