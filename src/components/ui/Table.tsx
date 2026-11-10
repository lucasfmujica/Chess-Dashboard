import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';

type Align = 'left' | 'center' | 'right';
const ALIGN: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/** Planilla ScoreTable: ruled rows, ink rule under the header, numbers aligned. */
export const Table = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className="overflow-x-auto rounded border border-hairline bg-surface">
    <table className={`w-full text-sm tabular-nums ${className}`}>{children}</table>
  </div>
);

export const THead = ({ children }: { children: ReactNode }) => (
  <thead className="border-b border-hairline-strong bg-surface-2">{children}</thead>
);

export const TBody = ({ children }: { children: ReactNode }) => (
  <tbody className="divide-y divide-hairline">{children}</tbody>
);

interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean;
}
export const TR = ({ interactive, className = '', children, ...rest }: TRProps) => (
  <tr
    className={`${interactive ? 'cursor-pointer transition-colors hover:bg-app' : ''} ${className}`}
    {...rest}
  >
    {children}
  </tr>
);

interface THProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: Align;
}
export const TH = ({ align = 'left', className = '', children, ...rest }: THProps) => (
  <th className={`px-3 py-2 text-label !text-fg-muted ${ALIGN[align]} whitespace-nowrap ${className}`} {...rest}>
    {children}
  </th>
);

interface TDProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: Align;
  muted?: boolean;
}
export const TD = ({ align = 'left', muted, className = '', children, ...rest }: TDProps) => (
  <td
    className={`px-3 py-2 ${ALIGN[align]} ${muted ? 'text-fg-muted' : 'text-fg'} ${className}`}
    {...rest}
  >
    {children}
  </td>
);
