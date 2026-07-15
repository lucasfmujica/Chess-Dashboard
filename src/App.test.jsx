import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { ModalProvider } from './components/modals/ModalContext';
import { GamesProvider } from './context/GamesContext';
import { UIProvider } from './context/UIContext';
import { GameViewerProvider } from './context/GameViewerContext';

// GamesProvider loads its data from the API on mount; stub it out so tests
// don't depend on a running backend.
vi.mock('./api/client', () => ({
  fetchGames: vi.fn().mockResolvedValue([]),
  postGames: vi.fn().mockResolvedValue({ inserted: 0 }),
  patchGamePgn: vi.fn(),
  deleteGamesBySource: vi.fn(),
  fetchProfile: vi.fn().mockResolvedValue(null),
  putProfile: vi.fn(),
  fetchRepertoire: vi.fn().mockResolvedValue({ white: [], black: [] }),
  putRepertoire: vi.fn(),
  fetchOpeningHeroes: vi.fn().mockResolvedValue({}),
  putOpeningHeroes: vi.fn(),
  fetchTournamentLocations: vi.fn().mockResolvedValue({}),
  putTournamentLocations: vi.fn(),
  fetchAnalyses: vi.fn().mockResolvedValue([]),
  postAnalysis: vi.fn(),
  fetchAnnotations: vi.fn().mockResolvedValue([]),
  postAnnotation: vi.fn(),
  putAnnotation: vi.fn(),
  deleteAnnotation: vi.fn(),
  postMigrate: vi.fn().mockResolvedValue({ migrated: false }),
}));

// Helper to render App with all required providers
const renderApp = () => {
  return render(
    <ThemeProvider>
      <ModalProvider>
        <GamesProvider>
          <UIProvider>
            <GameViewerProvider>
              <App />
            </GameViewerProvider>
          </UIProvider>
        </GamesProvider>
      </ModalProvider>
    </ThemeProvider>
  );
};

describe('App Component', () => {
  test('renders Chess Dashboard without crashing', () => {
    renderApp();
    // Check that the app renders successfully
    expect(document.body).toBeInTheDocument();
  });

  test('renders Chess Performance heading', async () => {
    renderApp();
    // GamesProvider resolves its API fetches asynchronously before rendering children.
    const heading = await screen.findByText(/Chess Performance/i);
    expect(heading).toBeInTheDocument();
  });

  test('renders navigation sidebar', async () => {
    renderApp();
    const navigation = await screen.findByRole('navigation');
    expect(navigation).toBeInTheDocument();
  });

  test('renders Overview tab by default', async () => {
    renderApp();
    const overviewButton = await screen.findByRole('button', { name: /Overview/i });
    expect(overviewButton).toBeInTheDocument();
  });
});
