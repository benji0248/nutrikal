import { Sun, Moon } from 'lucide-react';
import { useCalendarStore } from '../../store/useCalendarStore';

export function ThemeToggle() {
  const darkMode = useCalendarStore((s) => s.darkMode);
  const setDarkMode = useCalendarStore((s) => s.setDarkMode);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="p-2.5 rounded-xl bg-surface-elevated hover:bg-surface-elevated/80 transition-all duration-300 min-w-[48px] min-h-[48px] flex items-center justify-center"
      aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {darkMode ? (
        <Sun size={20} className="text-warning transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon size={20} className="text-accent transition-transform duration-300" />
      )}
    </button>
  );
}
