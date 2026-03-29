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
  allIngredients: Ingredient[];
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

export function DietaryPrefs({
  restrictions,
  onRestrictionsChange,
  dislikedIds,
  onDislikedChange,
  allIngredients,
}: DietaryPrefsProps) {
  const [search, setSearch] = useState('');
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

  const filteredIngredients = search.length >= 2
    ? allIngredients
        .filter((i) => !dislikedIds.includes(i.id))
        .filter((i) =>
          i.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .includes(search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
        )
        .slice(0, 8)
    : [];

  const getName = (id: string) => allIngredients.find((i) => i.id === id)?.name ?? id;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-body font-medium text-text-primary mb-2">
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
                  'px-3 py-1.5 rounded-xl text-xs font-body font-medium transition-all border',
                  active
                    ? 'bg-accent/15 text-accent border-accent/30'
                    : 'bg-surface2/30 text-muted border-border hover:text-text-primary',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-body font-medium text-text-primary mb-2">
          Alimentos que no te gustan
        </p>

        {dislikedIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {dislikedIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-body bg-red-500/10 text-red-400"
              >
                {getName(id)}
                <button type="button" onClick={() => removeDisliked(id)} className="hover:text-red-300 min-w-[20px] min-h-[20px] flex items-center justify-center">
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
              <div key={category} className="border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : category)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-body font-medium text-text-primary hover:bg-surface2/30 transition-colors min-h-[44px]"
                >
                  <span>
                    {category}
                    {selectedCount > 0 && (
                      <span className="ml-1.5 text-xs text-red-400">({selectedCount})</span>
                    )}
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
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
                            'px-2.5 py-1.5 rounded-lg text-xs font-body transition-all border min-h-[32px]',
                            active
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-surface2/30 text-muted border-border hover:text-text-primary',
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
            variant="search"
            placeholder="Buscar otro ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            clearable
            onClear={() => setSearch('')}
          />
          {filteredIngredients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-2xl shadow-lg max-h-48 overflow-y-auto">
              {filteredIngredients.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => addDisliked(ing.id)}
                  className="w-full text-left px-4 py-2.5 text-sm font-body text-text-primary hover:bg-surface2/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
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
