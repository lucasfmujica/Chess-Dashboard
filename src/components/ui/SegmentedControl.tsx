import type { ReactNode } from 'react';

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  'aria-label'?: string;
  className?: string;
}

/** Replaces the inline toggle groups scattered across tabs/charts. */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
  ...rest
}: SegmentedControlProps<T>) {
  const pad = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm';
  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={`inline-flex gap-1 rounded-lg border border-hairline bg-surface p-1 ${className}`}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors ${pad} ${
              active ? 'bg-surface-2 text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
