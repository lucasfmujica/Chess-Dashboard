import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ComponentType<{ className?: string }>;
  children?: ReactNode;
}

/**
 * Planilla buttons. `primary` is the pen (one per zone), `secondary` a ruled
 * sheet, `ghost` an inline action in pen ink.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg border border-accent hover:bg-accent-strong hover:border-accent-strong',
  secondary: 'bg-surface text-fg border border-hairline hover:border-fg-subtle',
  ghost: 'bg-transparent text-accent border border-transparent hover:underline underline-offset-4',
  danger: 'bg-surface text-loss border border-hairline hover:border-loss/60 hover:bg-carbon-pink/40',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
};

/** Single source of truth for buttons — replaces copy-pasted class strings. */
const Button = ({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  className = '',
  children,
  ...rest
}: ButtonProps) => (
  <button
    className={`inline-flex items-center justify-center rounded font-medium transition-colors
      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
      disabled:opacity-45 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    {...rest}
  >
    {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
    {children}
  </button>
);

export default Button;
