import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../context/ThemeContext';

interface ThemeToggleProps {
  /** Hide the text label (e.g. collapsed sidebar). */
  compact?: boolean;
}

const LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
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
      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-fg-muted border border-hairline hover:bg-surface-2 hover:text-fg transition-colors"
      aria-label={`Theme: ${LABELS[mode]}. Click to change.`}
      title={`Theme: ${LABELS[mode]}`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      {!compact && <span>{LABELS[mode]}</span>}
    </button>
  );
};

export default ThemeToggle;
