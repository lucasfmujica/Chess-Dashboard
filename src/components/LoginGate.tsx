import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { checkAuth, login } from '../api/client';
import { LogoMark } from './brand/Logo';
import blackKing from '../assets/pieces/merida/bK.svg';

type Status = 'checking' | 'out' | 'in';

/** Holds the app back until the browser has a valid session cookie. */
export default function LoginGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkAuth().then(ok => {
      if (!cancelled) setStatus(ok ? 'in' : 'out');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (await login(password)) {
        // Reload so every provider mounts fresh and fetches with the new cookie.
        window.location.reload();
        return;
      }
      setError('Contraseña incorrecta.');
    } catch {
      setError('No se pudo iniciar sesión. Probá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'checking') return null;
  if (status === 'in') return <>{children}</>;

  return (
    <main className="min-h-screen bg-app text-fg">
      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-12 px-4 py-12 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section className="min-w-0">
          <div className="flex items-center gap-3 text-fg">
            <LogoMark className="h-10 w-10" />
            <span className="font-serif text-4xl font-semibold leading-none">
              Jaque<span className="text-accent">+</span>
            </span>
          </div>
          <div className="mt-6 border-t-2 border-hairline-strong pt-4">
            <p className="text-label">Cuaderno de torneo</p>
            <p className="mt-2 max-w-md font-serif text-xl leading-snug text-fg-muted text-balance">
              Partidas, repertorio y progreso. Lo que se estudia, en papel; lo que se mide, en el reloj.
            </p>
          </div>
          <LoginBoard />
        </section>

        <form
          onSubmit={submit}
          className="rounded border border-hairline bg-surface p-6 shadow-[0_1px_0_rgb(var(--fg)/0.06)] sm:p-8"
          aria-label="Iniciar sesión"
        >
          <h1 className="font-serif text-2xl font-semibold">Entrar</h1>
          <p className="mt-1 text-sm text-fg-muted">Es un cuaderno privado. Escribí la contraseña para abrirlo.</p>
          <label htmlFor="password" className="text-label mt-6 block !text-fg-muted">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className="mt-2 h-11 w-full rounded border border-hairline bg-app px-3 font-mono text-base text-fg outline-none transition-colors focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          {error && (
            <p id="login-error" role="alert" className="mt-3 rounded-sm bg-carbon-pink px-3 py-2 text-sm text-fg">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || password.length === 0}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded border border-accent bg-accent text-sm font-medium text-accent-fg transition-colors hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-45"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}

/**
 * A small corner of a Tinta board with a king in check on the carbon-yellow
 * square: the mark, set as a position. Decoration only.
 */
const LoginBoard = () => {
  const cells = Array.from({ length: 16 }, (_, i) => {
    const r = Math.floor(i / 4);
    const c = i % 4;
    const dark = (r + c) % 2 === 1;
    const hi = r === 1 && c === 1;
    return { i, cls: hi ? 'bg-board-highlight' : dark ? 'bg-board-dark' : 'bg-board-light', hi };
  });
  return (
    <div
      className="mt-10 hidden w-56 grid-cols-4 overflow-hidden rounded-sm shadow-[0_0_0_1px_rgb(var(--border))] md:grid"
      aria-hidden="true"
    >
      {cells.map(cell => (
        <div key={cell.i} className={`relative aspect-square ${cell.cls}`}>
          {cell.hi && <img src={blackKing} alt="" className="absolute inset-0 h-full w-full" />}
        </div>
      ))}
    </div>
  );
};
