/**
 * Thin UCI wrapper around the Stockfish WASM worker (served from /engine/).
 * Evaluations are serialized (one `go` at a time).
 */

// The multi-threaded build needs SharedArrayBuffer, which needs the page to
// be cross-origin isolated (COOP/COEP headers). Fall back to the
// single-threaded build when that isn't available, rather than failing outright.
export const supportsMultiThread =
  typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated === true;

const ENGINE_URL = supportsMultiThread
  ? '/engine/stockfish-18-lite.js'
  : '/engine/stockfish-18-lite-single.js';

export interface PositionEval {
  /** Centipawns from the side-to-move's perspective (undefined if mate). */
  cp?: number;
  /** Mate-in-N from side-to-move's perspective (negative = getting mated). */
  mate?: number;
  /** Best move in UCI (e.g. 'e2e4'). */
  bestMove?: string;
}

/** One MultiPV line from a live search (side-to-move perspective). */
export interface EngineLineRaw {
  multipv: number;
  depth: number;
  cp?: number;
  mate?: number;
  /** Principal variation in UCI. */
  pv: string[];
}

export interface LiveAnalyzeOptions {
  multipv: number;
  mode: 'depth' | 'movetime';
  depth: number;
  movetimeMs: number;
  hashMb?: number;
  threads?: number;
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private listeners: ((line: string) => void)[] = [];
  /** Serialises live searches so they don't overlap. */
  private queue: Promise<unknown> = Promise.resolve();

  private post(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  /** Set a UCI option (e.g. Hash, MultiPV). */
  setOption(name: string, value: string | number): void {
    this.post(`setoption name ${name} value ${value}`);
  }

  /** Stop the current search and wait until the engine is idle again. */
  private async stopAndSync(): Promise<void> {
    this.post('stop');
    this.post('isready');
    await this.waitFor(l => l.includes('readyok'));
  }

  private onLine(line: string): void {
    for (const l of this.listeners) l(line);
  }

  /** Wait until a line satisfying `match` is received. */
  private waitFor(match: (line: string) => boolean, timeoutMs = 20000): Promise<void> {
    return new Promise((resolveP, reject) => {
      const timer = setTimeout(() => {
        this.listeners = this.listeners.filter(l => l !== listener);
        reject(new Error('Stockfish timed out'));
      }, timeoutMs);
      const listener = (line: string) => {
        if (match(line)) {
          clearTimeout(timer);
          this.listeners = this.listeners.filter(l => l !== listener);
          resolveP();
        }
      };
      this.listeners.push(listener);
    });
  }

  async init(): Promise<void> {
    if (this.ready) return;
    this.worker = new Worker(ENGINE_URL);
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data);
      this.onLine(line);
    };
    this.post('uci');
    await this.waitFor(l => l.includes('uciok'));
    this.post('isready');
    await this.waitFor(l => l.includes('readyok'));
    this.ready = true;
  }

  /**
   * Evaluate a FEN to the given depth; resolves with the final score and best move.
   */
  async evaluate(fen: string, depth: number): Promise<PositionEval> {
    if (!this.ready) await this.init();
    const result: PositionEval = {};
    return new Promise<PositionEval>((resolveP, reject) => {
      const timer = setTimeout(() => {
        this.listeners = this.listeners.filter(l => l !== listener);
        reject(new Error('Stockfish timed out'));
      }, 30000);
      const listener = (line: string) => {
        if (line.startsWith('info') && line.includes('score')) {
          const mateMatch = line.match(/score mate (-?\d+)/);
          const cpMatch = line.match(/score cp (-?\d+)/);
          if (mateMatch) { result.mate = parseInt(mateMatch[1], 10); result.cp = undefined; }
          else if (cpMatch) { result.cp = parseInt(cpMatch[1], 10); result.mate = undefined; }
        } else if (line.startsWith('bestmove')) {
          result.bestMove = line.split(' ')[1];
          clearTimeout(timer);
          this.listeners = this.listeners.filter(l => l !== listener);
          resolveP(result);
        }
      };
      this.listeners.push(listener);
      this.post('position fen ' + fen);
      this.post('go depth ' + depth);
    });
  }

  /**
   * Stream a MultiPV search for a position. `onUpdate` fires as lines improve;
   * resolves when the search ends. Calls are serialised so they never overlap.
   */
  analyzeLive(
    fen: string,
    opts: LiveAnalyzeOptions,
    onUpdate: (lines: EngineLineRaw[]) => void
  ): Promise<void> {
    const run = async () => {
      if (!this.ready) await this.init();
      await this.stopAndSync();
      if (opts.hashMb) this.setOption('Hash', opts.hashMb);
      if (opts.threads) this.setOption('Threads', opts.threads);
      this.setOption('MultiPV', Math.max(1, opts.multipv));

      const lines = new Map<number, EngineLineRaw>();
      await new Promise<void>(resolveP => {
        const listener = (line: string) => {
          if (line.startsWith('info') && line.includes('multipv') && line.includes(' pv ')) {
            const multipv = parseInt(line.match(/multipv (\d+)/)?.[1] ?? '1', 10);
            const depth = parseInt(line.match(/ depth (\d+)/)?.[1] ?? '0', 10);
            const mate = line.match(/score mate (-?\d+)/);
            const cp = line.match(/score cp (-?\d+)/);
            const pv = (line.match(/ pv (.+)$/)?.[1] ?? '').trim().split(/\s+/).filter(Boolean);
            lines.set(multipv, {
              multipv,
              depth,
              mate: mate ? parseInt(mate[1], 10) : undefined,
              cp: mate ? undefined : cp ? parseInt(cp[1], 10) : undefined,
              pv,
            });
            onUpdate([...lines.values()].sort((a, b) => a.multipv - b.multipv));
          } else if (line.startsWith('bestmove')) {
            this.listeners = this.listeners.filter(l => l !== listener);
            resolveP();
          }
        };
        this.listeners.push(listener);
        this.post('position fen ' + fen);
        this.post(opts.mode === 'movetime' ? `go movetime ${opts.movetimeMs}` : `go depth ${opts.depth}`);
      });
    };
    this.queue = this.queue.then(run, run);
    return this.queue as Promise<void>;
  }

  /** Stop any current search. */
  stop(): void {
    this.post('stop');
  }

  terminate(): void {
    this.post('quit');
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.listeners = [];
  }
}
