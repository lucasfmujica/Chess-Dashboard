import { createContext, useContext, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { getCurrentWeekStart } from '../utils/chessHelpers';

export type GameFilter = 'all' | 'otb' | 'online';
export type SortField = 'date' | 'opponent' | 'result';
export type SortOrder = 'asc' | 'desc';

interface UIContextValue {
  activeTab: string;
  setActiveTab: Dispatch<SetStateAction<string>>;
  gameFilter: GameFilter;
  setGameFilter: Dispatch<SetStateAction<GameFilter>>;

  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;

  whiteSortBy: SortField;
  setWhiteSortBy: Dispatch<SetStateAction<SortField>>;
  whiteSortOrder: SortOrder;
  setWhiteSortOrder: Dispatch<SetStateAction<SortOrder>>;
  blackSortBy: SortField;
  setBlackSortBy: Dispatch<SetStateAction<SortField>>;
  blackSortOrder: SortOrder;
  setBlackSortOrder: Dispatch<SetStateAction<SortOrder>>;

  showPgnImport: boolean;
  setShowPgnImport: Dispatch<SetStateAction<boolean>>;
  pgnText: string;
  setPgnText: Dispatch<SetStateAction<string>>;

  currentWeek: string;
  setCurrentWeek: Dispatch<SetStateAction<string>>;
  editingDay: string | null;
  setEditingDay: Dispatch<SetStateAction<string | null>>;
}

const UIContext = createContext<UIContextValue | null>(null);

export const useUI = (): UIContextValue => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

export const UIProvider = ({ children }: { children: ReactNode }) => {
  // UI State
  const [activeTab, setActiveTab] = useState('overview');
  const [gameFilter, setGameFilter] = useState<GameFilter>('otb');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Sorting State
  const [whiteSortBy, setWhiteSortBy] = useState<SortField>('date');
  const [whiteSortOrder, setWhiteSortOrder] = useState<SortOrder>('desc');
  const [blackSortBy, setBlackSortBy] = useState<SortField>('date');
  const [blackSortOrder, setBlackSortOrder] = useState<SortOrder>('desc');

  // PGN Import State
  const [showPgnImport, setShowPgnImport] = useState(false);
  const [pgnText, setPgnText] = useState('');

  // Training State
  const [currentWeek, setCurrentWeek] = useState<string>(getCurrentWeekStart);
  const [editingDay, setEditingDay] = useState<string | null>(null);

  const value: UIContextValue = {
    activeTab,
    setActiveTab,
    gameFilter,
    setGameFilter,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    whiteSortBy,
    setWhiteSortBy,
    whiteSortOrder,
    setWhiteSortOrder,
    blackSortBy,
    setBlackSortBy,
    blackSortOrder,
    setBlackSortOrder,
    showPgnImport,
    setShowPgnImport,
    pgnText,
    setPgnText,
    currentWeek,
    setCurrentWeek,
    editingDay,
    setEditingDay,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
