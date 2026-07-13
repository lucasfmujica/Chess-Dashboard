import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ComponentType<{ className?: string }>;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-strong border border-transparent',
  secondary: 'bg-surface text-fg border border-hairline hover:bg-surface-2',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg border border-transparent',
  danger: 'bg-transparent text-loss border border-hairline hover:bg-loss/10',
};

const SIZES: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-3.5 py-2 text-sm gap-2',
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
    className={`inline-flex items-center justify-center rounded-md font-medium transition-colors
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
      disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    {...rest}
  >
    {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
    {children}
  </button>
);

export default Button;
