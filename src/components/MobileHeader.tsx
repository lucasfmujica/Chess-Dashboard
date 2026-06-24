interface MobileHeaderProps {
  setIsMobileMenuOpen: (open: boolean) => void;
}

const MobileHeader = ({ setIsMobileMenuOpen }: MobileHeaderProps) => {
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-hairline">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
          aria-label="Open mobile menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-fg">Chess Dashboard</h1>
        <div className="w-10" aria-hidden="true" /> {/* Spacer for centering */}
      </div>
    </div>
  );
};

export default MobileHeader;
