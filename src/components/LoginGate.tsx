import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { checkAuth, login } from '../api/client';

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
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4" aria-label="Iniciar sesión">
        <h1 className="text-xl font-semibold">Chess Dashboard</h1>
        <label className="block text-sm">
          Contraseña
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-black"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="w-full rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
