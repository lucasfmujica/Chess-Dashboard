import { LogoMark } from './brand/Logo';
import { APP_NAME } from '../config/brand';

interface MobileHeaderProps {
  setIsMobileMenuOpen: (open: boolean) => void;
}

const MobileHeader = ({ setIsMobileMenuOpen }: MobileHeaderProps) => {
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-surface border-b border-hairline">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2.5 rounded text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="flex items-center gap-2 text-fg"><LogoMark className="h-5 w-5" /><span className="font-serif text-base font-semibold">{APP_NAME}</span></span>
        <div className="w-10" aria-hidden="true" /> {/* Spacer for centering */}
      </div>
    </div>
  );
};

export default MobileHeader;
