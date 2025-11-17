import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

const UIContext = createContext(null);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

export const UIProvider = ({ children }) => {
  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [gameFilter, setGameFilter] = useState('otb'); // 'all', 'otb', 'online'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sorting State
  const [whiteSortBy, setWhiteSortBy] = useState('date');
  const [whiteSortOrder, setWhiteSortOrder] = useState('desc');
  const [blackSortBy, setBlackSortBy] = useState('date');
  const [blackSortOrder, setBlackSortOrder] = useState('desc');

  // PGN Import State
  const [showPgnImport, setShowPgnImport] = useState(false);
  const [pgnText, setPgnText] = useState('');

  // Training State
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysFromMonday);

    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const day = String(startOfWeek.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [editingDay, setEditingDay] = useState(null);

  const value = {
    // Tab & Filter State
    activeTab,
    setActiveTab,
    gameFilter,
    setGameFilter,

    // Mobile & Sidebar State
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,

    // Sorting State
    whiteSortBy,
    setWhiteSortBy,
    whiteSortOrder,
    setWhiteSortOrder,
    blackSortBy,
    setBlackSortBy,
    blackSortOrder,
    setBlackSortOrder,

    // PGN Import State
    showPgnImport,
    setShowPgnImport,
    pgnText,
    setPgnText,

    // Training State
    currentWeek,
    setCurrentWeek,
    editingDay,
    setEditingDay,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

UIProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
