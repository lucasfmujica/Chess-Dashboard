import React from 'react';
import PropTypes from 'prop-types';

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
}) => {
  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-white/95 backdrop-blur-md shadow-2xl z-50 transition-all duration-300 ease-in-out overflow-y-auto ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isSidebarCollapsed ? 'lg:w-20' : 'w-72'}`}
    >
      {/* Sidebar Header */}
      <div className={`p-6 border-b border-slate-200 ${isSidebarCollapsed ? 'lg:px-4' : ''}`}>
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <div>
                <h2 className="text-lg font-bold text-slate-900">Chess Analytics</h2>
                <p className="text-xs text-slate-600">Lucas's Performance</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close mobile menu"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick Stats in Sidebar */}
        {!isSidebarCollapsed && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
              <span className="text-xs font-medium text-slate-600">Current ELO</span>
              <span className="text-sm font-bold text-emerald-600">{playerInfo.current_elo}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
              <span className="text-xs font-medium text-slate-600">Total Games</span>
              <span className="text-sm font-bold text-slate-900">{filteredGames.length}</span>
            </div>
          </div>
        )}

        {/* Collapse/Expand Button (Desktop only) */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className={`w-5 h-5 text-slate-600 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className={`p-4 space-y-1 ${isSidebarCollapsed ? 'lg:px-2' : ''}`} aria-label="Main navigation">
        {navigationTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            } ${isSidebarCollapsed ? 'lg:justify-center lg:px-3' : ''}`}
            aria-label={`Navigate to ${tab.label}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            title={isSidebarCollapsed ? tab.label : ''}
          >
            <span className="text-lg" aria-hidden="true">{tab.icon}</span>
            {!isSidebarCollapsed && <span>{tab.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
};

Sidebar.propTypes = {
  isMobileMenuOpen: PropTypes.bool.isRequired,
  setIsMobileMenuOpen: PropTypes.func.isRequired,
  isSidebarCollapsed: PropTypes.bool.isRequired,
  setIsSidebarCollapsed: PropTypes.func.isRequired,
  playerInfo: PropTypes.shape({
    current_elo: PropTypes.number.isRequired,
  }).isRequired,
  filteredGames: PropTypes.array.isRequired,
  navigationTabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
};

export default Sidebar;
