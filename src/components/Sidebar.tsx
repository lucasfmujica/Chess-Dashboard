import type { Dispatch, SetStateAction } from 'react';
import type { Game, PlayerInfo } from '../types/chess';
import ThemeToggle from './ThemeToggle';

interface NavigationTab {
  id: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  playerInfo: PlayerInfo;
  filteredGames: Game[];
  navigationTabs: NavigationTab[];
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
}

const Sidebar = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  playerInfo,
  filteredGames,
  navigationTabs,
  activeTab,
  setActiveTab,
}: SidebarProps) => {
  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-surface border-r border-hairline z-50 transition-all duration-300 ease-in-out overflow-y-auto ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isSidebarCollapsed ? 'lg:w-20' : 'w-72'}`}
    >
      {/* Sidebar Header */}
      <div className={`p-4 border-b border-hairline ${isSidebarCollapsed ? 'lg:px-3' : ''}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2.5 ${isSidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            <div className="flex items-center justify-center w-8 h-8 bg-fg rounded-md">
              <svg className="w-5 h-5 text-app" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <div>
                <h2 className="text-sm font-semibold text-fg leading-tight">Chess Analytics</h2>
                <p className="text-xs text-fg-subtle">Lucas's Performance</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
            aria-label="Close mobile menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick Stats in Sidebar */}
        {!isSidebarCollapsed && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="px-3 py-2 rounded-md border border-hairline bg-surface-2">
              <p className="text-[11px] font-medium text-fg-subtle uppercase tracking-wide">ELO</p>
              <p className="text-base font-semibold text-fg tabular-nums">{playerInfo.current_elo}</p>
            </div>
            <div className="px-3 py-2 rounded-md border border-hairline bg-surface-2">
              <p className="text-[11px] font-medium text-fg-subtle uppercase tracking-wide">Games</p>
              <p className="text-base font-semibold text-fg tabular-nums">{filteredGames.length}</p>
            </div>
          </div>
        )}

        {/* Theme toggle + Collapse/Expand */}
        <div className={`mt-4 gap-2 ${isSidebarCollapsed ? 'flex flex-col lg:items-stretch' : 'flex'}`}>
          <ThemeToggle compact={isSidebarCollapsed} />
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="flex items-center justify-center p-2 rounded-xl border border-hairline text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className={`p-3 space-y-0.5 ${isSidebarCollapsed ? 'lg:px-2' : ''}`} aria-label="Main navigation">
        {navigationTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setIsMobileMenuOpen(false);
            }}
            className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.id
                ? 'bg-surface-2 text-fg before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-accent'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
            } ${isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
            aria-label={`Navigate to ${tab.label}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            title={isSidebarCollapsed ? tab.label : ''}
          >
            <span className="text-base" aria-hidden="true">{tab.icon}</span>
            {!isSidebarCollapsed && <span>{tab.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
