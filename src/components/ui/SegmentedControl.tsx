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

/**
 * Planilla "Segmented": the tabs of a ruled column header. The chosen option
 * is underlined in pen; no pill, no fill.
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
  ...rest
}: SegmentedControlProps<T>) {
  const pad = size === 'sm' ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-2 text-sm';
  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={`inline-flex max-w-full flex-wrap border-b border-hairline ${className}`}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${pad} ${
              active ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg'
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
