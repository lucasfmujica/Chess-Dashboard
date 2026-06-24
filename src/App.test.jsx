import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { ModalProvider } from './components/modals/ModalContext';
import { GamesProvider } from './context/GamesContext';
import { UIProvider } from './context/UIContext';
import { GameViewerProvider } from './context/GameViewerContext';

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

  test('renders Chess Performance heading', () => {
    renderApp();
    // Check that Chess Performance text exists somewhere in the document
    const heading = screen.getByText(/Chess Performance/i);
    expect(heading).toBeInTheDocument();
  });

  test('renders navigation sidebar', () => {
    renderApp();
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();
  });

  test('renders Overview tab by default', () => {
    renderApp();
    const overviewButton = screen.getByRole('button', { name: /Overview/i });
    expect(overviewButton).toBeInTheDocument();
  });
});
