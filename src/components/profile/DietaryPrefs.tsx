import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import type { DietaryRestriction, Ingredient } from '../../types';
import { Input } from '../ui/Input';

interface DietaryPrefsProps {
  restrictions: DietaryRestriction[];
  onRestrictionsChange: (restrictions: DietaryRestriction[]) => void;
  dislikedIds: string[];
  onDislikedChange: (ids: string[]) => void;
  dislikedCategories: string[];
  onDislikedCategoriesChange: (cats: string[]) => void;
  allowedExceptions: string[];
  onAllowedExceptionsChange: (ids: string[]) => void;
  allIngredients: Ingredient[];
  /** Living Journal (DESIGN.md): chips y superficies sin bordes duros */
  tone?: 'default' | 'journal';
}

const RESTRICTION_OPTIONS: { value: DietaryRestriction; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetariano' },
  { value: 'vegan', label: 'Vegano' },
  { value: 'gluten_free', label: 'Sin gluten' },
  { value: 'lactose_free', label: 'Sin lactosa' },
  { value: 'low_sodium', label: 'Bajo en sodio' },
  { value: 'diabetic', label: 'Diabético' },
];

/** Top ~100 commonly disliked ingredients, grouped by category for easy browsing. */
const COMMON_DISLIKES: { category: string; ids: string[] }[] = [
  {
    category: 'Carnes y pescados',
    ids: [
      'ing_010', // Bondiola de cerdo
      'ing_012', // Costilla de cerdo
      'ing_013', // Merluza
      'ing_014', // Salmón
      'ing_015', // Atún fresco
      'ing_016', // Trucha
      'ing_017', // Lenguado
      'ing_018', // Caballa
      'ing_019', // Camarones
      'ing_020', // Mejillones
      'ing_021', // Calamar
      'ing_024', // Salame
      'ing_028', // Chorizo parrillero
      'ing_029', // Morcilla
      'ing_030', // Salchicha de Viena
      'ing_031', // Salchicha parrillera
      'ing_035', // Filete de tilapia
    ],
  },
  {
    category: 'Verduras',
    ids: [
      'ing_038', // Cebolla
      'ing_041', // Batata
      'ing_043', // Zapallo
      'ing_044', // Calabaza
      'ing_045', // Espinaca
      'ing_046', // Brócoli
      'ing_047', // Coliflor
      'ing_049', // Berenjena
      'ing_051', // Morrón verde
      'ing_052', // Pepino
      'ing_053', // Rúcula
      'ing_054', // Radicheta
      'ing_055', // Apio
      'ing_056', // Puerro
      'ing_057', // Remolacha
      'ing_059', // Acelga
      'ing_060', // Repollo blanco
      'ing_061', // Repollo colorado
      'ing_062', // Ajo
      'ing_066', // Champiñones
      'ing_067', // Palmitos
      'ing_068', // Alcaucil
      'ing_069', // Espárrago
      'ing_070', // Nabo
      'ing_071', // Rabanito
      'ing_072', // Mandioca
      'ing_074', // Endivia
      'ing_075', // Hinojo
    ],
  },
  {
    category: 'Frutas',
    ids: [
      'ing_080', // Pomelo
      'ing_088', // Ananá
      'ing_091', // Ciruela
      'ing_093', // Mango
      'ing_097', // Higo
      'ing_098', // Coco rallado
      'ing_099', // Palta
      'ing_100', // Maracuyá
    ],
  },
  {
    category: 'Lácteos y quesos',
    ids: [
      'ing_101', // Leche entera
      'ing_105', // Yogur griego
      'ing_106', // Queso crema
      'ing_110', // Queso roquefort
      'ing_113', // Queso brie
      'ing_114', // Ricota
      'ing_115', // Crema de leche
      'ing_116', // Dulce de leche
      'ing_119', // Queso provolone
    ],
  },
  {
    category: 'Cereales y legumbres',
    ids: [
      'ing_122', // Arroz integral cocido
      'ing_125', // Fideos integrales secos
      'ing_127', // Pan integral
      'ing_131', // Harina integral
      'ing_134', // Quinoa cocida
      'ing_135', // Polenta cocida
      'ing_136', // Cuscús cocido
      'ing_141', // Mijo cocido
      'ing_142', // Trigo burgol cocido
      'ing_143', // Amaranto cocido
      'ing_145', // Germen de trigo
      'ing_146', // Lentejas cocidas
      'ing_147', // Garbanzos cocidos
      'ing_148', // Porotos negros cocidos
      'ing_149', // Porotos colorados cocidos
      'ing_150', // Porotos de soja cocidos
      'ing_152', // Habas cocidas
      'ing_155', // Edamame
    ],
  },
  {
    category: 'Frutos secos y semillas',
    ids: [
      'ing_154', // Maní tostado
      'ing_159', // Almendras
      'ing_160', // Nueces
      'ing_161', // Castañas de cajú
      'ing_162', // Avellanas
      'ing_163', // Semillas de chía
      'ing_164', // Semillas de lino
      'ing_166', // Semillas de sésamo
      'ing_169', // Aceitunas verdes
      'ing_170', // Aceitunas negras
    ],
  },
  {
    category: 'Condimentos y salsas',
    ids: [
      'ing_204', // Ketchup
      'ing_205', // Mostaza
      'ing_206', // Salsa de soja
      'ing_168', // Mayonesa
      'ing_209', // Aderezo César
      'ing_224', // Paté
    ],
  },
  {
    category: 'Otros',
    ids: [
      'ing_158', // Aceite de coco
      'ing_167', // Manteca de maní
      'ing_172', // Leche de soja
      'ing_171', // Leche de almendras
      'ing_265', // Cacao en polvo
    ],
  },
];

/** General food categories that can be disliked as a whole, with optional exceptions. */
const GENERAL_CATEGORIES: { value: string; label: string }[] = [
  { value: 'pescado', label: 'Pescado' },
];

export function DietaryPrefs({
  restrictions,
  onRestrictionsChange,
  dislikedIds,
  onDislikedChange,
  dislikedCategories,
  onDislikedCategoriesChange,
  allowedExceptions,
  onAllowedExceptionsChange,
  allIngredients,
  tone = 'default',
}: DietaryPrefsProps) {
  const j = tone === 'journal';
  const [search, setSearch] = useState('');
  const [exceptionSearch, setExceptionSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleRestriction = (r: DietaryRestriction) => {
    if (restrictions.includes(r)) {
      onRestrictionsChange(restrictions.filter((x) => x !== r));
    } else {
      onRestrictionsChange([...restrictions, r]);
    }
  };

  const toggleDisliked = (id: string) => {
    if (dislikedIds.includes(id)) {
      onDislikedChange(dislikedIds.filter((x) => x !== id));
    } else {
      onDislikedChange([...dislikedIds, id]);
    }
  };

  const removeDisliked = (id: string) => {
    onDislikedChange(dislikedIds.filter((x) => x !== id));
  };

  const addDisliked = (id: string) => {
    if (!dislikedIds.includes(id)) {
      onDislikedChange([...dislikedIds, id]);
    }
    setSearch('');
  };

  const toggleCategory = (cat: string) => {
    if (dislikedCategories.includes(cat)) {
      onDislikedCategoriesChange(dislikedCategories.filter((c) => c !== cat));
      // Also remove any exceptions for this category
      onAllowedExceptionsChange(allowedExceptions.filter((id) => !isCategoryIngredient(cat, id)));
    } else {
      onDislikedCategoriesChange([...dislikedCategories, cat]);
    }
  };

  const toggleException = (id: string) => {
    if (allowedExceptions.includes(id)) {
      onAllowedExceptionsChange(allowedExceptions.filter((x) => x !== id));
    } else {
      onAllowedExceptionsChange([...allowedExceptions, id]);
    }
    setExceptionSearch('');
  };

  /** Check if an ingredient belongs to a general category */
  function isCategoryIngredient(cat: string, ingredientId: string): boolean {
    const ing = allIngredients.find((i) => i.id === ingredientId);
    if (!ing) return false;
    if (cat === 'pescado') {
      const fishIds = ['ing_013', 'ing_014', 'ing_015', 'ing_016', 'ing_017', 'ing_018', 'ing_035'];
      return fishIds.includes(ingredientId);
    }
    return false;
  }

  /** Get all ingredients for a category (for exception selection) */
  function getCategoryIngredients(cat: string): Ingredient[] {
    if (cat === 'pescado') {
      const fishIds = ['ing_013', 'ing_014', 'ing_015', 'ing_016', 'ing_017', 'ing_018', 'ing_035'];
      return allIngredients.filter((i) => fishIds.includes(i.id));
    }
    return [];
  }

  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filteredIngredients = search.length >= 2
    ? allIngredients
        .filter((i) => !dislikedIds.includes(i.id))
        .filter((i) => normalize(i.name).includes(normalize(search)))
        .slice(0, 8)
    : [];

  const filteredExceptions = exceptionSearch.length >= 1
    ? dislikedCategories.flatMap((cat) => getCategoryIngredients(cat))
        .filter((i) => !allowedExceptions.includes(i.id))
        .filter((i) => normalize(i.name).includes(normalize(exceptionSearch)))
        .slice(0, 8)
    : [];

  const getName = (id: string) => allIngredients.find((i) => i.id === id)?.name ?? id;

  return (
    <div className="space-y-5">
      <div>
        <p className={clsx('text-sm font-body font-medium mb-2', j ? 'text-[#191c17]' : 'text-text-primary')}>
          Restricciones alimentarias
        </p>
        <div className="flex flex-wrap gap-2">
          {RESTRICTION_OPTIONS.map(({ value, label }) => {
            const active = restrictions.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleRestriction(value)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-body font-medium transition-all',
                  j
                    ? clsx(
                        'rounded-full shadow-[0px_4px_12px_rgba(25,28,23,0.05)]',
                        active
                          ? 'bg-[#226046] text-[#f8faf6]'
                          : 'bg-white text-[#191c17] hover:bg-[#f3f5eb]',
                      )
                    : clsx(
                        'rounded-xl border',
                        active
                          ? 'bg-accent/15 text-accent border-accent/30'
                          : 'bg-surface2/30 text-muted border-border hover:text-text-primary',
                      ),
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* General category dislikes */}
      <div>
        <p className={clsx('text-sm font-body font-medium mb-2', j ? 'text-[#191c17]' : 'text-text-primary')}>
          Categorías que no te gustan
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {GENERAL_CATEGORIES.map(({ value, label }) => {
            const active = dislikedCategories.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleCategory(value)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-body font-medium transition-all',
                  j
                    ? clsx(
                        'rounded-full shadow-[0px_4px_12px_rgba(25,28,23,0.05)]',
                        active
                          ? 'bg-[#fef2f2] text-[#b91c1c] ring-1 ring-red-200/80'
                          : 'bg-white text-[#191c17] hover:bg-[#f3f5eb]',
                      )
                    : clsx(
                        'rounded-xl border',
                        active
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-surface2/30 text-muted border-border hover:text-text-primary',
                      ),
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Exceptions for selected categories */}
        {dislikedCategories.length > 0 && (
          <div
            className={clsx(
              'ml-2 pl-3 space-y-2',
              j ? 'border-l-2 border-[#226046]/20' : 'border-l-2 border-accent/30',
            )}
          >
            <p className={clsx('text-xs font-body', j ? 'text-[#5a6258]' : 'text-muted')}>
              Excepciones (sí te gustan a pesar de la categoría)
            </p>
            {allowedExceptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allowedExceptions.map((id) => (
                  <span
                    key={id}
                    className={clsx(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-body',
                      j ? 'bg-[#f3f5eb] text-[#226046]' : 'bg-green-500/10 text-green-400',
                    )}
                  >
                    {getName(id)}
                    <button
                      type="button"
                      onClick={() => toggleException(id)}
                      className={clsx(
                        'min-w-[20px] min-h-[20px] flex items-center justify-center',
                        j ? 'hover:text-[#191c17]' : 'hover:text-green-300',
                      )}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Quick exception chips */}
            <div className="flex flex-wrap gap-1.5">
              {dislikedCategories.flatMap((cat) => getCategoryIngredients(cat))
                .filter((i) => !allowedExceptions.includes(i.id))
                .map((ing) => (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => toggleException(ing.id)}
                    className={clsx(
                      'px-2.5 py-1.5 text-xs font-body transition-all min-h-[32px]',
                      j
                        ? 'rounded-full bg-white text-[#5a6258] shadow-[0px_4px_12px_rgba(25,28,23,0.06)] hover:text-[#191c17]'
                        : 'rounded-lg border bg-surface2/30 text-muted border-border hover:text-text-primary',
                    )}
                  >
                    {ing.name}
                  </button>
                ))}
            </div>
            {/* Exception search */}
            <div className="relative">
              <Input
                tone={j ? 'journal' : 'default'}
                variant="search"
                placeholder="Buscar excepción..."
                value={exceptionSearch}
                onChange={(e) => setExceptionSearch(e.target.value)}
                clearable
                onClear={() => setExceptionSearch('')}
              />
              {filteredExceptions.length > 0 && (
                <div
                  className={clsx(
                    'absolute z-10 w-full mt-1 rounded-2xl max-h-36 overflow-y-auto py-1',
                    j
                      ? 'bg-white shadow-[0px_16px_40px_rgba(25,28,23,0.1)]'
                      : 'bg-surface border border-border shadow-lg',
                  )}
                >
                  {filteredExceptions.map((ing) => (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => toggleException(ing.id)}
                      className={clsx(
                        'w-full text-left px-4 py-2.5 text-sm font-body transition-colors',
                        j
                          ? 'text-[#191c17] hover:bg-[#f3f5eb] first:rounded-t-2xl last:rounded-b-2xl'
                          : 'text-text-primary hover:bg-surface2/50 first:rounded-t-2xl last:rounded-b-2xl',
                      )}
                    >
                      {ing.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <p className={clsx('text-sm font-body font-medium mb-2', j ? 'text-[#191c17]' : 'text-text-primary')}>
          Ingredientes específicos que no te gustan
        </p>

        {dislikedIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {dislikedIds.map((id) => (
              <span
                key={id}
                className={clsx(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-body',
                  j ? 'bg-[#fef2f2] text-[#b91c1c]' : 'bg-red-500/10 text-red-400',
                )}
              >
                {getName(id)}
                <button
                  type="button"
                  onClick={() => removeDisliked(id)}
                  className={clsx(
                    'min-w-[20px] min-h-[20px] flex items-center justify-center',
                    j ? 'hover:text-[#7f1d1d]' : 'hover:text-red-300',
                  )}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Quick picks by category */}
        <div className="space-y-1.5 mb-3">
          {COMMON_DISLIKES.map(({ category, ids }) => {
            const isExpanded = expandedCategory === category;
            const selectedCount = ids.filter((id) => dislikedIds.includes(id)).length;
            return (
              <div
                key={category}
                className={clsx(
                  'rounded-[1.25rem] overflow-hidden',
                  j ? 'bg-white shadow-[0px_8px_24px_rgba(25,28,23,0.06)]' : 'border border-border',
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2.5 text-sm font-body font-medium transition-colors min-h-[44px]',
                    j ? 'text-[#191c17] hover:bg-[#f8faf1]' : 'text-text-primary hover:bg-surface2/30',
                  )}
                >
                  <span>
                    {category}
                    {selectedCount > 0 && (
                      <span className={clsx('ml-1.5 text-xs', j ? 'text-[#b91c1c]' : 'text-red-400')}>
                        ({selectedCount})
                      </span>
                    )}
                  </span>
                  {isExpanded ? (
                    <ChevronUp size={16} className={j ? 'text-[#5a6258]' : 'text-muted'} />
                  ) : (
                    <ChevronDown size={16} className={j ? 'text-[#5a6258]' : 'text-muted'} />
                  )}
                </button>
                {isExpanded && (
                  <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                    {ids.map((id) => {
                      const active = dislikedIds.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleDisliked(id)}
                          className={clsx(
                            'px-2.5 py-1.5 text-xs font-body transition-all min-h-[32px]',
                            j
                              ? clsx(
                                  'rounded-full',
                                  active
                                    ? 'bg-[#fef2f2] text-[#b91c1c] ring-1 ring-red-200/60'
                                    : 'bg-[#f3f5eb] text-[#5a6258] hover:text-[#191c17]',
                                )
                              : clsx(
                                  'rounded-lg border',
                                  active
                                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                    : 'bg-surface2/30 text-muted border-border hover:text-text-primary',
                                ),
                          )}
                        >
                          {getName(id)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Search for ingredients not in the quick picks */}
        <div className="relative">
          <Input
            tone={j ? 'journal' : 'default'}
            variant="search"
            placeholder="Buscar otro ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            clearable
            onClear={() => setSearch('')}
          />
          {filteredIngredients.length > 0 && (
            <div
              className={clsx(
                'absolute z-10 w-full mt-1 rounded-2xl max-h-48 overflow-y-auto py-1',
                j ? 'bg-white shadow-[0px_16px_40px_rgba(25,28,23,0.1)]' : 'bg-surface border border-border shadow-lg',
              )}
            >
              {filteredIngredients.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => addDisliked(ing.id)}
                  className={clsx(
                    'w-full text-left px-4 py-2.5 text-sm font-body transition-colors first:rounded-t-2xl last:rounded-b-2xl',
                    j ? 'text-[#191c17] hover:bg-[#f3f5eb]' : 'text-text-primary hover:bg-surface2/50',
                  )}
                >
                  {ing.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
