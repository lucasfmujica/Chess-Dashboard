import type { ComponentType, Dispatch, SetStateAction } from 'react';
import { ChevronDoubleLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { LogoMark } from './brand/Logo';
import { APP_NAME } from '../config/brand';
import type { Game, PlayerInfo } from '../types/chess';
import ThemeToggle from './ThemeToggle';

interface NavigationTab {
  /**
   * Contador que se muestra al lado del nombre. Existe para el diagnóstico:
   * pedir un análisis desde la app solo lo encola, y el trabajo real corre en
   * la máquina de Lucas, así que sin un número acá un pedido se queda esperando
   * sin que nada lo diga.
   */
  badge?: number;
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
  const delta = playerInfo.elo_change_last_tournament;
  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-surface border-r border-hairline z-50 transition-all duration-300 ease-in-out overflow-y-auto ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isSidebarCollapsed ? 'lg:w-20' : 'w-72'}`}
    >
      {/* Mark, ELO clock and controls */}
      <div className={`px-4 pt-5 pb-4 ${isSidebarCollapsed ? 'lg:px-3' : ''}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2.5 text-fg ${isSidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            <LogoMark className="h-6 w-6 shrink-0" />
            {!isSidebarCollapsed && (
              <span className="font-serif text-lg font-semibold leading-none">{APP_NAME}</span>
            )}
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 rounded text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
            aria-label="Cerrar menú"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* The ELO as a chess-clock readout */}
        {isSidebarCollapsed ? (
          <div className="mt-4 hidden lg:block rounded-2xl bg-clock px-1 py-2 text-center font-mono text-sm font-medium tabular-nums text-clock-fg" title={`ELO ${playerInfo.current_elo}`}>
            {playerInfo.current_elo}
          </div>
        ) : null}
        <div className={`mt-4 rounded-2xl bg-clock px-4 py-3 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-clock-muted">ELO FIDE</p>
          <p className="mt-0.5 font-mono text-[28px] font-medium leading-8 tabular-nums text-clock-fg">{playerInfo.current_elo}</p>
          <p className={`font-mono text-xs tabular-nums ${delta >= 0 ? 'text-clock-lit' : 'text-clock-flag'}`}>
            {delta >= 0 ? '▲ +' : '▼ −'}{Math.abs(delta)} · {playerInfo.last_tournament}
          </p>
          <p className="mt-1 text-xs text-clock-muted tabular-nums">{filteredGames.length} partidas</p>
        </div>

        <div className={`mt-3 gap-2 ${isSidebarCollapsed ? 'flex flex-col lg:items-stretch' : 'flex'}`}>
          <ThemeToggle compact={isSidebarCollapsed} />
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="flex items-center justify-center p-2 rounded border border-hairline text-fg-muted hover:border-fg-subtle hover:text-fg transition-colors"
            aria-label={isSidebarCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            title={isSidebarCollapsed ? 'Expandir' : 'Colapsar'}
          >
            <ChevronDoubleLeftIcon
              className={`w-5 h-5 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Navigation — grouped into sections */}
      <nav className={`px-3 pb-8 ${isSidebarCollapsed ? 'lg:px-2' : ''}`} aria-label="Navegación principal">
        {navigationSections.map((group, gi) => (
          <div key={group.section} className="mt-5">
            {isSidebarCollapsed ? (
              gi > 0 && <div className="mx-2 mb-2 border-t border-hairline lg:block hidden" aria-hidden="true" />
            ) : (
              <p className="px-3 mb-1 text-label">{group.section}</p>
            )}
            <div className="space-y-px">
              {group.items.map(tab => {
                const active = isActive(tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      active ? 'bg-accent/10 text-accent' : 'text-fg-muted hover:bg-app hover:text-fg'
                    } ${isSidebarCollapsed ? 'lg:justify-center lg:px-2 lg:py-2' : ''}`}
                    aria-label={tab.label}
                    aria-current={active ? 'page' : undefined}
                    title={isSidebarCollapsed ? tab.label : ''}
                  >
                    <tab.icon className={`w-5 h-5 shrink-0 ${isSidebarCollapsed ? 'hidden lg:block' : 'hidden'}`} aria-hidden="true" />
                    {!isSidebarCollapsed ? <span>{tab.label}</span> : <span className="lg:hidden">{tab.label}</span>}
                    {tab.badge ? (
                      <span
                        className="ml-auto font-mono text-xs tabular-nums text-fg-subtle"
                        title={`${tab.badge} pendiente${tab.badge > 1 ? 's' : ''}`}
                      >
                        {tab.badge}
                      </span>
                    ) : null}
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
