import React from 'react';
import { Squares2X2Icon, ArrowTrendingUpIcon, TrophyIcon, BeakerIcon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';

export default {
  title: 'Components/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

const mockPlayerInfo = {
  current_elo: 1750,
};

const mockNavigationTabs = [
  { id: 'overview', label: 'Overview', icon: Squares2X2Icon },
  { id: 'rating', label: 'ELO Progress', icon: ArrowTrendingUpIcon },
  { id: 'tournaments', label: 'Tournaments', icon: TrophyIcon },
  { id: 'analytics', label: 'Analytics', icon: BeakerIcon },
];

const mockFilteredGames = [
  { id: 1, result: 'W' },
  { id: 2, result: 'L' },
  { id: 3, result: 'D' },
];

const Template = (args) => <Sidebar {...args} />;

export const Default = Template.bind({});
Default.args = {
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {},
  isSidebarCollapsed: false,
  setIsSidebarCollapsed: () => {},
  playerInfo: mockPlayerInfo,
  filteredGames: mockFilteredGames,
  navigationTabs: mockNavigationTabs,
  activeTab: 'overview',
  setActiveTab: () => {},
};

export const Collapsed = Template.bind({});
Collapsed.args = {
  ...Default.args,
  isSidebarCollapsed: true,
};

export const MobileOpen = Template.bind({});
MobileOpen.args = {
  ...Default.args,
  isMobileMenuOpen: true,
};

export const WithManyGames = Template.bind({});
WithManyGames.args = {
  ...Default.args,
  filteredGames: Array.from({ length: 50 }, (_, i) => ({ id: i, result: 'W' })),
};
