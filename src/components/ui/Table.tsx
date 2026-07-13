import type { HTMLAttributes, ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';

type Align = 'left' | 'center' | 'right';
const ALIGN: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/** Scroll container + base table. Roomier density than a raw spreadsheet. */
export const Table = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className="overflow-x-auto rounded-lg border border-hairline">
    <table className={`w-full text-sm ${className}`}>{children}</table>
  </div>
);

export const THead = ({ children }: { children: ReactNode }) => (
  <thead className="border-b border-hairline bg-surface-2/50">{children}</thead>
);

export const TBody = ({ children }: { children: ReactNode }) => (
  <tbody className="divide-y divide-hairline">{children}</tbody>
);

interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean;
}
export const TR = ({ interactive, className = '', children, ...rest }: TRProps) => (
  <tr
    className={`${interactive ? 'cursor-pointer transition-colors hover:bg-surface-2' : ''} ${className}`}
    {...rest}
  >
    {children}
  </tr>
);

interface THProps extends ThHTMLAttributes<HTMLTableCellElement> {
  align?: Align;
}
export const TH = ({ align = 'left', className = '', children, ...rest }: THProps) => (
  <th className={`px-4 py-2.5 text-label ${ALIGN[align]} whitespace-nowrap ${className}`} {...rest}>
    {children}
  </th>
);

interface TDProps extends TdHTMLAttributes<HTMLTableCellElement> {
  align?: Align;
  muted?: boolean;
}
export const TD = ({ align = 'left', muted, className = '', children, ...rest }: TDProps) => (
  <td
    className={`px-4 py-2.5 ${ALIGN[align]} ${muted ? 'text-fg-muted' : 'text-fg'} ${className}`}
    {...rest}
  >
    {children}
  </td>
);
