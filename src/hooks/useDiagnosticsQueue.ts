import { useEffect, useState } from 'react';
import { fetchDiagnosticsStatus } from '../api/client';

/**
 * Cuántas partidas están esperando análisis.
 *
 * El botón de "pedir análisis" encola y nada más: el análisis corre después en
 * la máquina de Lucas. Sin un contador visible en algún lado, un pedido se puede
 * quedar ahí para siempre sin que nada lo diga — que es lo que pasaba. Es lo que
 * cierra el lazo entre pedir y correr.
 */
export const useDiagnosticsQueue = () => {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Envuelto entero, no solo el .catch: esto se llama desde la raíz de la app,
    // y si el fetcher no existe (un test que mockea el cliente a medias) la
    // llamada tira antes de devolver una promesa y se lleva puesta toda la
    // pantalla. Un contador no puede hacer eso.
    try {
      void fetchDiagnosticsStatus()
        .then(s => {
          if (!cancelled) setPending(s.requested?.length ?? 0);
        })
        .catch(() => undefined);
    } catch {
      // Sin datos, cero: es lo mismo que "no hay nada pendiente".
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return pending;
};
