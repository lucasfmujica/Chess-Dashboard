import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../context/ThemeContext';

interface ThemeToggleProps {
  /** Hide the text label (e.g. collapsed sidebar). */
  compact?: boolean;
}

const LABELS: Record<ThemeMode, string> = {
  light: 'Día',
  dark: 'Noche',
  system: 'Sistema',
};

/**
 * Cycles light -> dark -> system. Shows the icon for the current mode.
 */
const ThemeToggle = ({ compact = false }: ThemeToggleProps) => {
  const { mode, cycle } = useTheme();

  const Icon = mode === 'light' ? SunIcon : mode === 'dark' ? MoonIcon : ComputerDesktopIcon;

  return (
    <button
      onClick={cycle}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium text-fg-muted border border-hairline hover:border-fg-subtle hover:text-fg transition-colors"
      aria-label={`Tema: ${LABELS[mode]}. Click para cambiar.`}
      title={`Tema: ${LABELS[mode]}`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      {!compact && <span>{LABELS[mode]}</span>}
    </button>
  );
};

export default ThemeToggle;
