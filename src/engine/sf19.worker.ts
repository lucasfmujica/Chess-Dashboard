/// <reference lib="webworker" />
/**
 * Worker que arranca el Stockfish 19 de Lichess y lo expone como UCI por líneas.
 *
 * El build de nmrugg (`stockfish` en npm, lo que usaba la app) es un worker que
 * ya habla UCI: se le postea un comando y contesta. El de Lichess no — es un
 * módulo de emscripten que hay que instanciar, y su .wasm NO trae la red
 * neuronal: hay que bajarla aparte y pasársela con setNnueBuffer. Este archivo
 * es esa diferencia, encapsulada, para que stockfishEngine.ts siga viendo un
 * worker que responde líneas UCI.
 *
 * Necesita SharedArrayBuffer, o sea que la página tiene que estar aislada entre
 * orígenes (COOP/COEP). Sin eso ni arranca, y por eso stockfishEngine.ts sigue
 * cayendo al build 18 de un solo hilo cuando el aislamiento no está.
 */
import makeStockfish from '@lichess-org/stockfish-web/sf_19.js';

/** Dónde el copy-engine deja el .wasm y la red. */
const ASSETS = '/engine/';

interface StockfishWeb {
  uci(command: string): void;
  setNnueBuffer(data: Uint8Array, index?: number): void;
  getRecommendedNnue(index?: number): string | undefined;
  listen: (data: string) => void;
  onError: (msg: string) => void;
}

const boot = async (): Promise<StockfishWeb> => {
  const sf = (await makeStockfish({
    locateFile: (file: string) => ASSETS + file,
    // El build usa pthreads, así que la memoria tiene que ser compartida y
    // declarar su máximo por adelantado: WebAssembly no la puede crecer más
    // allá de lo que se reserva acá.
    wasmMemory: new WebAssembly.Memory({ initial: 2048, maximum: 32768, shared: true }),
  })) as StockfishWeb;

  sf.onError = (msg: string) => self.postMessage(`info string error: ${msg}`);
  sf.listen = (line: string) => self.postMessage(line);

  // La red va aparte del .wasm. El propio motor dice cuál quiere, así que
  // actualizar de red no toca este archivo.
  const net = sf.getRecommendedNnue(0);
  if (net) {
    const res = await fetch(ASSETS + net);
    if (!res.ok) throw new Error(`no se pudo cargar la red ${net} (${res.status})`);
    sf.setNnueBuffer(new Uint8Array(await res.arrayBuffer()), 0);
  }
  return sf;
};

// Los comandos que llegan antes de que el motor exista se encolan en vez de
// perderse: stockfishEngine.ts postea 'uci' apenas construye el worker.
const pending: string[] = [];
let engine: StockfishWeb | null = null;

self.onmessage = (e: MessageEvent) => {
  const cmd = typeof e.data === 'string' ? e.data : String(e.data);
  if (engine) engine.uci(cmd);
  else pending.push(cmd);
};

boot()
  .then(sf => {
    engine = sf;
    for (const cmd of pending) sf.uci(cmd);
    pending.length = 0;
  })
  .catch(err => {
    self.postMessage(`info string error: ${err?.message ?? err}`);
  });
