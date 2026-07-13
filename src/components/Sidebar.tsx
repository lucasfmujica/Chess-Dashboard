import type { ComponentType, Dispatch, SetStateAction } from 'react';
import { CheckCircleIcon, ChevronDoubleLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Game, PlayerInfo } from '../types/chess';
import ThemeToggle from './ThemeToggle';

interface NavigationTab {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface NavigationSection {
  section: string;
  items: NavigationTab[];
}

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  playerInfo: PlayerInfo;
  filteredGames: Game[];
  navigationSections: NavigationSection[];
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
  navigationSections,
  activeTab,
  setActiveTab,
}: SidebarProps) => {
  // A nav item is active for its own id and any sub-tab (e.g. by-color-white).
  const isActive = (id: string) => activeTab === id || activeTab.startsWith(`${id}-`);
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
              <CheckCircleIcon className="w-5 h-5 text-app" aria-hidden="true" />
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
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
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
            <ChevronDoubleLeftIcon
              className={`w-5 h-5 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Navigation Items — grouped into sections */}
      <nav className={`p-3 ${isSidebarCollapsed ? 'lg:px-2' : ''}`} aria-label="Main navigation">
        {navigationSections.map((group, gi) => (
          <div key={group.section} className={gi > 0 ? 'mt-4' : ''}>
            {isSidebarCollapsed ? (
              gi > 0 && <div className="mx-2 mb-2 border-t border-hairline lg:block hidden" aria-hidden="true" />
            ) : (
              <p className="px-3 mb-1.5 text-label">{group.section}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map(tab => {
                const active = isActive(tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-accent before:transition-opacity before:duration-200 ${
                      active
                        ? 'bg-surface-2 text-fg before:opacity-100'
                        : 'text-fg-muted hover:bg-surface-2 hover:text-fg before:opacity-0'
                    } ${isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                    aria-label={`Navigate to ${tab.label}`}
                    aria-current={active ? 'page' : undefined}
                    title={isSidebarCollapsed ? tab.label : ''}
                  >
                    <tab.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    {!isSidebarCollapsed && <span>{tab.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
