import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/animations.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { ModalProvider } from './components/modals/ModalContext';
import { GamesProvider } from './context/GamesContext';
import { UIProvider } from './context/UIContext';
import { GameViewerProvider } from './context/GameViewerContext';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <ModalProvider>
          <GamesProvider>
            <UIProvider>
              <GameViewerProvider>
                <App />
              </GameViewerProvider>
            </UIProvider>
          </GamesProvider>
        </ModalProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
