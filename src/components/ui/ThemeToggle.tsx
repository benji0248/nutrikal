import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-2xl bg-surface2 hover:bg-surface2/70 transition-all min-w-[48px] min-h-[48px] flex items-center justify-center"
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {theme === 'dark' ? (
        <Sun size={18} className="text-amber" />
      ) : (
        <Moon size={18} className="text-accent" />
      )}
    </button>
  );
}
