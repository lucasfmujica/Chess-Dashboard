import React from 'react';
import { isStaleChunkError, reloadOnceForStaleChunk } from '../utils/staleChunkRecovery';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // A stale lazy-chunk error (old tab, new deployment) isn't a real app bug —
    // reload once to pick up the current build instead of showing the error UI.
    if (isStaleChunkError(error) && reloadOnceForStaleChunk()) return;

    this.setState({
      error,
      errorInfo,
    });

    // Log error to console for debugging
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Reload the page to reset application state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-app text-fg flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded border border-hairline border-t-[3px] border-t-hairline-strong bg-surface p-6 sm:p-8">
            <p className="text-label">Error</p>
            <h1 className="mt-1 font-serif text-2xl font-semibold">Algo salió mal</h1>
            <p className="mt-1 text-sm text-fg-muted">La app encontró un error inesperado y no pudo seguir.</p>

            <div className="mt-5 rounded-sm bg-carbon-pink px-4 py-3">
              <h2 className="text-label !text-fg-muted mb-1">Detalle</h2>
              <p className="text-sm text-fg font-mono break-words">
                {this.state.error && this.state.error.toString()}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4 rounded-sm border border-hairline bg-surface-2 p-4">
                <summary className="text-sm font-medium text-fg cursor-pointer">Stack (modo desarrollo)</summary>
                <pre className="mt-3 text-xs text-fg-muted overflow-x-auto whitespace-pre-wrap break-words">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <h3 className="mt-6 text-label !text-fg-muted">Qué podés hacer</h3>
            <ul className="mt-2 space-y-1 text-sm text-fg-muted list-disc list-inside">
              <li>Recargar la página</li>
              <li>Borrar la caché y el almacenamiento local del navegador</li>
              <li>Revisar la conexión a internet</li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex h-10 flex-1 items-center justify-center rounded border border-accent bg-accent px-5 text-sm font-medium text-accent-fg hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label="Recargar la app"
              >
                Recargar la app
              </button>
              <button
                onClick={() => window.history.back()}
                className="inline-flex h-10 items-center justify-center rounded border border-hairline bg-surface px-5 text-sm font-medium text-fg hover:border-fg-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                aria-label="Volver a la página anterior"
              >
                Volver
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
