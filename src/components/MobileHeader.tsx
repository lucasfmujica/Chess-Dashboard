interface MobileHeaderProps {
  setIsMobileMenuOpen: (open: boolean) => void;
}

const MobileHeader = ({ setIsMobileMenuOpen }: MobileHeaderProps) => {
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200">
      <div className="flex items-center justify-between px-4 py-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
          aria-label="Open mobile menu"
        >
          <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-slate-900">Chess Dashboard</h1>
        <div className="w-10" aria-hidden="true" /> {/* Spacer for centering */}
      </div>
    </div>
  );
};

export default MobileHeader;
