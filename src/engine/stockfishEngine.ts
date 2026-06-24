/**
 * Thin UCI wrapper around the single-threaded Stockfish WASM worker
 * (served from /engine/). Evaluations are serialized (one `go` at a time).
 */

const ENGINE_URL = '/engine/stockfish-18-lite-single.js';

export interface PositionEval {
  /** Centipawns from the side-to-move's perspective (undefined if mate). */
  cp?: number;
  /** Mate-in-N from side-to-move's perspective (negative = getting mated). */
  mate?: number;
  /** Best move in UCI (e.g. 'e2e4'). */
  bestMove?: string;
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready = false;
  private listeners: ((line: string) => void)[] = [];

  private post(cmd: string): void {
    this.worker?.postMessage(cmd);
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
