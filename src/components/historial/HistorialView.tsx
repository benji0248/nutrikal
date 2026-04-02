import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, Heart, UtensilsCrossed, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useHistorialStore } from '../../store/useHistorialStore';
import { searchDishes } from '../../services/searchService';
import { HistorialCard } from './HistorialCard';

type Filter = 'todos' | 'favoritos';

interface SearchResult {
  dishName: string;
  similarity: number;
}

export const HistorialView = () => {
  const [filter, setFilter] = useState<Filter>('todos');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const favorites = useHistorialStore((s) => s.favorites);
  const toggleFavorite = useHistorialStore((s) => s.toggleFavorite);
  const isFavorite = useHistorialStore((s) => s.isFavorite);
  const getFrequencyMap = useHistorialStore((s) => s.getFrequencyMap);

  const frequencyMap = useMemo(() => getFrequencyMap(), [getFrequencyMap]);

  const sortedDishes = useMemo(() => {
    const entries = Array.from(frequencyMap.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));
    entries.sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate));

    if (filter === 'favoritos') {
      return entries.filter((e) => favorites.includes(e.name));
    }
    return entries;
  }, [frequencyMap, filter, favorites]);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchDishes(value.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const clearSearch = () => {
    setQuery('');
    setSearchResults(null);
    setSearching(false);
  };

  const isShowingSearch = searchResults !== null || searching;
  const isEmpty = sortedDishes.length === 0 && !isShowingSearch;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-heading font-bold text-[var(--text-primary)]">Historial</h2>

      {/* Search bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Buscar platos..."
          className="w-full pl-9 pr-9 py-3 rounded-2xl bg-[var(--surface2)]/60 border border-[var(--border)]/40 text-sm font-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-[var(--accent)]/60 transition-colors min-h-[48px]"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl hover:bg-[var(--surface2)] transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X size={16} className="text-[var(--text-muted)]" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      {!isShowingSearch && (
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('todos')}
            className={clsx(
              'px-4 py-2 rounded-full text-xs font-body font-medium transition-colors min-h-[36px]',
              filter === 'todos'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface2)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('favoritos')}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-body font-medium transition-colors min-h-[36px]',
              filter === 'favoritos'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface2)]/60 text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            <Heart size={12} />
            Favoritos
          </button>
        </div>
      )}

      {/* Search results */}
      {searching && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {searchResults !== null && !searching && (
        <div className="space-y-2">
          <p className="text-xs font-body text-[var(--text-muted)]">
            {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para &quot;{query}&quot;
          </p>
          {searchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-body text-[var(--text-muted)]">
                No se encontraron platos similares
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((r) => {
                const freq = frequencyMap.get(r.dishName);
                return (
                  <HistorialCard
                    key={r.dishName}
                    name={r.dishName}
                    count={freq?.count ?? 0}
                    lastDate={freq?.lastDate ?? new Date().toISOString().slice(0, 10)}
                    isFavorite={isFavorite(r.dishName)}
                    onToggleFavorite={() => toggleFavorite(r.dishName)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Frequency list */}
      {!isShowingSearch && !isEmpty && (
        <div className="space-y-2">
          {sortedDishes.map((dish) => (
            <HistorialCard
              key={dish.name}
              name={dish.name}
              count={dish.count}
              lastDate={dish.lastDate}
              isFavorite={isFavorite(dish.name)}
              onToggleFavorite={() => toggleFavorite(dish.name)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[var(--surface2)] flex items-center justify-center mb-4">
            <UtensilsCrossed size={28} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-body font-medium text-[var(--text-primary)] mb-1">
            {filter === 'favoritos' ? 'No tenés favoritos todavía' : 'Tu historial está vacío'}
          </p>
          <p className="text-xs font-body text-[var(--text-muted)] max-w-[260px]">
            {filter === 'favoritos'
              ? 'Tocá el corazón en cualquier plato para guardarlo acá'
              : 'Pedile a Nutri que te arme la semana y acá vas a ver tu historial'}
          </p>
        </div>
      )}
    </div>
  );
};
