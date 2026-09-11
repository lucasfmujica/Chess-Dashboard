/**
 * Banco de pruebas del chat sobre posiciones.
 *
 * "Salió mejor" leído en la pantalla no es evidencia: el modelo razona en `low`,
 * no es determinista, y una respuesta linda puede estar apoyada en nada. Esto
 * corre la MISMA pregunta N veces contra el endpoint local y devuelve números
 * comparables antes y después de un cambio: cuántas vueltas gastó, cuántas
 * mediciones repitió, cuánto tardó, y cuántas de las cifras que dice la
 * respuesta salen de verdad de algo que midió.
 *
 * Corre el bucle de `src/engine/diagnosticChatLoop.ts` — el mismo que usa la
 * app— con el Stockfish nativo en lugar del WASM del navegador. Lo único que no
 * es comparable con producción es el tiempo del motor: nativo es mucho más
 * rápido que WASM. Las vueltas, las mediciones y el tiempo del MODELO sí lo son.
 *
 * Uso:
 *   npm run dev:api                                  # en otra terminal
 *   npx tsx --env-file=.env.local scripts/chat-eval.mts --runs 3
 *   npx tsx --env-file=.env.local scripts/chat-eval.mts --case planes --runs 1 --verbose
 *   npx tsx --env-file=.env.local scripts/chat-eval.mts --save .eval/chat-eval-antes.json
 *   npx tsx --env-file=.env.local scripts/chat-eval.mts --compare .eval/chat-eval-antes.json
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';
import {
  runDiagnosticChat,
  MAX_ROUNDS,
  type ChatLoopResult,
  type WireTurn,
} from '../src/engine/diagnosticChatLoop';

const API = process.env.CHAT_EVAL_API ?? 'http://localhost:3001/api';
const STOCKFISH = process.env.STOCKFISH_PATH ?? '/opt/homebrew/bin/stockfish';

/**
 * Los casos de prueba.
 *
 * `debeMedir` y `debeDecir` son las preguntas concretas que este caso tiene que
 * poder contestar: no miden estilo, miden si el modelo llegó al hecho que hacía
 * falta. Se chequean sobre el registro de lo que midió y sobre el texto final.
 */
interface EvalCase {
  id: string;
  fen: string;
  /** El contexto que arma DiagnosticsPanel cuando la posición está diagnosticada. */
  context: string;
  question: string;
  /** Etiquetas de mediciones que la respuesta buena necesita (subcadena). */
  debeMedir?: { label: string; needle: string }[];
  /** Cosas que la respuesta buena nombra (cualquiera de los sinónimos). */
  debeDecir?: { label: string; any: string[] }[];
}

/**
 * Caso de referencia: la brecha conceptual real de la partida.
 *
 * Lucas jugó 10...Nxa4 comiendo un peón. Las blancas tienen los peones a
 * DOBLADOS (a2 y a4): comerse el de a4 y dejar que el caballo recapture les
 * REPARA la estructura y le saca a las negras el blanco fijo que tenían en la
 * columna a. Stockfish quiere Bf5, que desarrolla pegándole a la dama de d3 y
 * mantiene la presión. Una respuesta buena tiene que llegar a eso midiendo los
 * rasgos de las dos líneas, no estimando.
 */
const CASES: EvalCase[] = [
  {
    id: 'planes',
    fen: 'r1bq1rk1/1pp1ppbp/1n1p1np1/8/P2P4/2NQ1NP1/PBP1PPBP/R4RK1 b - - 4 10',
    context: [
      'Posición (FEN): r1bq1rk1/1pp1ppbp/1n1p1np1/8/P2P4/2NQ1NP1/PBP1PPBP/R4RK1 b - - 4 10',
      'Lucas jugó Nxa4 y perdió 190 centipeones.',
      'Stockfish quería Bf5 (10...Bf5 11. Qd1 Ne4 12. e3 Nc4 13. Qc1 c5 14. Rb1).',
      'Maia-1900 juega Nxa4.',
    ].join('\n'),
    question: '¿Por qué Bf5 es mejor que Nxa4, si Nxa4 me gana un peón? ¿Qué planes tiene el negro?',
    debeMedir: [
      { label: 'rasgos de Bf5', needle: 'rasgos de bf5' },
      { label: 'rasgos de la línea de Nxa4', needle: 'rasgos de nxa4' },
    ],
    debeDecir: [
      // "dobl" y no "doblado": la respuesta buena puede decir "le desdoblás los
      // peones", que es la misma idea conjugada al revés.
      { label: 'que Nxa4 le arregla la estructura', any: ['dobl', 'estructura', 'columna a', 'peones de la a'] },
      { label: 'un plan concreto para el negro', any: ['ne4', 'nc4', 'c5', 'e5', 'presi', 'plan'] },
    ],
  },
  {
    /** Control: pregunta corta de una sola parte. No debería gastar ocho vueltas. */
    id: 'simple',
    fen: 'r1bq1rk1/1pp1ppbp/1n1p1np1/8/P2P4/2NQ1NP1/PBP1PPBP/R4RK1 b - - 4 10',
    context: [
      'Posición (FEN): r1bq1rk1/1pp1ppbp/1n1p1np1/8/P2P4/2NQ1NP1/PBP1PPBP/R4RK1 b - - 4 10',
      'Lucas jugó Nxa4 y perdió 190 centipeones.',
      'Stockfish quería Bf5 (10...Bf5 11. Qd1 Ne4 12. e3 Nc4 13. Qc1 c5 14. Rb1).',
      'Maia-1900 juega Nxa4.',
    ].join('\n'),
    question: '¿Cuánto pierde exactamente Nxa4 comparado con Bf5?',
  },
  {
    /** Control del arreglo bilingüe: el concepto que Lucas estudió está en inglés. */
    id: 'concepto',
    fen: 'r1bq1rk1/1pp1ppbp/1n1p1np1/8/P2P4/2NQ1NP1/PBP1PPBP/R4RK1 b - - 4 10',
    context:
      'Posición (FEN): r1bq1rk1/1pp1ppbp/1n1p1np1/8/P2P4/2NQ1NP1/PBP1PPBP/R4RK1 b - - 4 10\n' +
      'Esta posición no está diagnosticada: no hay nada precalculado sobre ella, evaluá lo que necesites.',
    question: '¿Los peones doblados de a2 y a4 son una debilidad acá? ¿Qué dice de eso lo que estudié?',
    debeMedir: [{ label: 'fue a buscar el concepto', needle: 'concepto:' }],
    // El mecanismo (que haya ido a buscarlo) es el chequeo que importa; que
    // nombre la fuente se mira aparte, con los títulos de la biblioteca entre
    // las agujas: la respuesta buena dice "en Simple Chess te marcaron que...".
    debeDecir: [
      {
        label: 'nombra la fuente',
        any: [
          'segun', 'silman', 'libro', 'capitulo', 'estudiaste', 'te marcaron',
          'simple chess', 'reassess', 'tratado', 'lecciones', 'pecados', 'zebra',
          'cebras', 'en tu indice', 'del curso',
        ],
      },
    ],
  },
];

/**
 * Un Stockfish nativo por corrida, hablado por UCI.
 *
 * Un proceso UCI atiende una búsqueda por vez, y el bucle pide las mediciones de
 * una vuelta en paralelo (`Promise.all`), igual que en el navegador. Así que las
 * pedidas se encolan acá: sin la cola, la segunda le pisa el oyente a la primera
 * y la primera no vuelve nunca. El Stockfish WASM de la app hace lo mismo por su
 * cuenta; esto le copia el comportamiento, no lo cambia.
 */
const openEngine = () => {
  const proc = spawn(STOCKFISH, [], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buffer = '';
  let listener: { done: (line: string) => boolean; onLine: (line: string) => void; resolve: () => void } | null = null;

  proc.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!listener) continue;
      listener.onLine(line);
      if (listener.done(line)) {
        const { resolve } = listener;
        listener = null;
        resolve();
      }
    }
  });

  const send = (cmd: string) => proc.stdin.write(`${cmd}\n`);
  const until = (done: (line: string) => boolean, onLine: (line: string) => void = () => {}) =>
    new Promise<void>(resolve => {
      listener = { done, onLine, resolve };
    });

  const handshake = async () => {
    const ok = until(l => l.startsWith('uciok'));
    send('uci');
    await ok;
    const ready = until(l => l.startsWith('readyok'));
    send('isready');
    await ready;
  };

  /** Una búsqueda por vez, en orden de llegada. */
  let queue: Promise<unknown> = Promise.resolve();
  const serialise = <T>(job: () => Promise<T>): Promise<T> => {
    const next = queue.then(job, job);
    queue = next.catch(() => {});
    return next;
  };

  return {
    ready: handshake(),
    /** cp/mate desde el lado que mueve, igual que el WASM del navegador. */
    evaluate: (fen: string, depth: number) => serialise(async () => {
      let cp: number | undefined;
      let mate: number | undefined;
      let bestMove: string | undefined;
      const done = until(
        l => l.startsWith('bestmove'),
        line => {
          if (line.startsWith('info') && line.includes(' pv ')) {
            const cpMatch = /score cp (-?\d+)/.exec(line);
            const mateMatch = /score mate (-?\d+)/.exec(line);
            // La última línea de `info` gana: es la del depth más profundo.
            if (cpMatch) {
              cp = Number(cpMatch[1]);
              mate = undefined;
            } else if (mateMatch) {
              mate = Number(mateMatch[1]);
              cp = undefined;
            }
          }
          if (line.startsWith('bestmove')) bestMove = line.split(' ')[1];
        }
      );
      send('ucinewgame');
      send(`position fen ${fen}`);
      send(`go depth ${depth}`);
      await done;
      return { cp, mate, bestMove: bestMove === '(none)' ? undefined : bestMove, profundidad: depth };
    }),
    close: () => {
      send('quit');
      proc.kill();
    },
  };
};

/**
 * Sin tope de tiempo una corrida se puede quedar colgada para siempre esperando
 * al proveedor, y eso no se distingue de un modelo que piensa mucho. Con tope,
 * la corrida se anota como fallada y el banco sigue.
 */
const MODEL_TIMEOUT_MS = Number(process.env.CHAT_EVAL_TIMEOUT_MS ?? 180_000);

const askChat = async (turns: WireTurn[], final: boolean) => {
  const res = await fetch(`${API}/prep?resource=diagnostic-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.API_SECRET ? { 'x-api-key': process.env.API_SECRET } : {}),
    },
    body: JSON.stringify({ turns, final }),
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`endpoint ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as { text: string; toolCalls: never[] };
};

const searchConcepts = async (query: string) => {
  const res = await fetch(
    `${API}/prep?resource=diagnostic-aggregates&kind=concepts&q=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error(`conceptos ${res.status}`);
  return await res.json();
};

/**
 * ¿La respuesta se apoya en lo medido, o estima?
 *
 * Se sacan del texto las cifras en peones ("+1.4", "-0.8") y se buscan entre las
 * evaluaciones que de verdad volvieron del motor, con tolerancia de 5 cp. Una
 * cifra que no está en ninguna medición es una cifra inventada — que es
 * exactamente lo que todo este diseño existe para evitar.
 */
const groundingOf = (result: ChatLoopResult) => {
  const measuredCp = new Set<number>();
  for (const { output } of result.outputs) {
    for (const m of output.matchAll(/"(?:evaluacion_cp|con_la_pieza_cp|sin_la_pieza_cp)":(-?\d+)/g)) {
      measuredCp.add(Number(m[1]));
    }
  }
  // Las diferencias entre dos mediciones también son cifras legítimas.
  const derived = new Set<number>(measuredCp);
  for (const a of measuredCp) for (const b of measuredCp) derived.add(a - b);

  const cited = [...result.text.matchAll(/([+-]?\d+[.,]\d+)/g)].map(m =>
    Math.round(Number(m[1].replace(',', '.')) * 100)
  );
  // Tolerancia de 10 cp y no de 5: el modelo cita en peones con un decimal, y
  // una diferencia entre dos cifras ya redondeadas puede correrse hasta 10.
  const unbacked = cited.filter(
    cp => ![...derived].some(d => Math.abs(d - cp) <= 10 || Math.abs(Math.abs(d) - Math.abs(cp)) <= 10)
  );
  return { cited: cited.length, unbacked: unbacked.length, unbackedValues: unbacked };
};

/** Sin tildes y en minúsculas: la respuesta las trae y las agujas no. */
const fold = (text: string) =>
  text
    .toLowerCase()
    .replace(/[áàä]/g, 'a')
    .replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u')
    .replace(/ñ/g, 'n');

/**
 * Se evalúa contra el texto y contra lo que midió, y se recalcula AL REPORTAR y
 * no al correr: así una corrida guardada de hace un rato se juzga con la misma
 * vara que la de ahora. Si el rubro se congelara en el registro, arreglar una
 * aguja mal puesta obligaría a volver a correr todo.
 */
const checkCase = (c: EvalCase, result: { text: string; evaluated: string[] }) => {
  const measured = result.evaluated.map(fold);
  const text = fold(result.text);
  const midio = (c.debeMedir ?? []).map(m => ({
    label: m.label,
    ok: measured.some(e => e.includes(fold(m.needle))),
  }));
  const dijo = (c.debeDecir ?? []).map(d => ({
    label: d.label,
    ok: d.any.some(n => text.includes(fold(n))),
  }));
  return { midio, dijo };
};

interface RunRecord {
  case: string;
  run: number;
  rounds: number;
  requested: number;
  executed: number;
  cacheHits: number;
  dropped: number;
  modelSec: number;
  toolSec: number;
  exhausted: boolean;
  grounding: ReturnType<typeof groundingOf>;
  checks: ReturnType<typeof checkCase>;
  text: string;
  evaluated: string[];
  perRound: ChatLoopResult['stats']['perRound'];
}

const runOnce = async (
  c: EvalCase,
  run: number,
  verbose: boolean,
  legacy: boolean
): Promise<RunRecord> => {
  const started = Date.now();
  // Un motor por corrida: así una corrida no hereda las tablas hash de la anterior.
  const engine = openEngine();
  await engine.ready;
  try {
    new Chess(c.fen); // avisa temprano si el FEN del caso está mal
    const history: WireTurn[] = [
      { role: 'user', text: `${c.context}\n\nPregunta: ${c.question}` },
    ];
    const result = await runDiagnosticChat(history, new Map(), {
      fen: c.fen,
      scoreOf: engine.evaluate,
      askChat,
      searchConcepts,
      legacy,
      onProgress: label => {
        if (verbose && label) process.stderr.write(`      · ${label}\n`);
      },
      onRound: r => {
        process.stderr.write(`   vuelta ${r.n} (${Math.round((r.since - started) / 1000)}s)\n`);
      },
    });
    const s = result.stats;
    return {
      case: c.id,
      run,
      rounds: s.rounds,
      requested: s.requested,
      executed: s.executed,
      cacheHits: s.cacheHits,
      dropped: s.dropped,
      modelSec: Math.round(s.modelMs / 100) / 10,
      toolSec: Math.round(s.toolMs / 100) / 10,
      exhausted: result.exhausted,
      grounding: groundingOf(result),
      checks: checkCase(c, result),
      text: result.text,
      evaluated: result.evaluated,
      perRound: s.perRound,
    };
  } finally {
    engine.close();
  }
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const summarise = (records: RunRecord[]) => {
  const byCase = new Map<string, RunRecord[]>();
  for (const r of records) byCase.set(r.case, [...(byCase.get(r.case) ?? []), r]);
  const rows: Record<string, number | string>[] = [];
  for (const [id, rs] of byCase) {
    // Separadas a propósito. "midió" es el mecanismo —¿fue a buscar el hecho que
    // hacía falta?— y generaliza. "dijo" es la conclusión, y el prompt la puede
    // estar empujando. Mezclarlas haría pasar por hallazgo lo que puede ser sólo
    // que se le sopló la respuesta.
    const spec = CASES.find(c => c.id === id);
    const scored = spec ? rs.map(r => checkCase(spec, r)) : [];
    const midio = scored.flatMap(r => r.midio);
    const dijo = scored.flatMap(r => r.dijo);
    const fmt = (cs: { ok: boolean }[]) =>
      cs.length === 0 ? '-' : `${cs.filter(c => c.ok).length}/${cs.length}`;
    rows.push({
      caso: id,
      corridas: rs.length,
      vueltas: median(rs.map(r => r.rounds)),
      pedidas: median(rs.map(r => r.requested)),
      corridas_reales: median(rs.map(r => r.executed)),
      repetidas: median(rs.map(r => r.cacheHits)),
      descartadas: median(rs.map(r => r.dropped)),
      modelo_s: median(rs.map(r => r.modelSec)),
      motor_s: median(rs.map(r => r.toolSec)),
      sin_cerrar: rs.filter(r => r.exhausted).length,
      cifras_sin_respaldo: median(rs.map(r => r.grounding.unbacked)),
      midio_lo_que_hacia_falta: fmt(midio),
      dijo_la_conclusion: fmt(dijo),
    });
  }
  return rows;
};

const main = async () => {
  const runs = Number(arg('runs', '3'));
  const only = arg('case');
  const verbose = process.argv.includes('--verbose');
  // `--legacy` mide el comportamiento anterior. Para una comparación completa
  // hay que dejar también el servidor como estaba:
  //   git stash push api/prep.ts && ... --legacy --save build/antes.json && git stash pop
  const legacy = process.argv.includes('--legacy');
  const cases = only ? CASES.filter(c => c.id === only) : CASES;
  if (cases.length === 0) throw new Error(`No hay caso "${only}". Hay: ${CASES.map(c => c.id).join(', ')}`);

  // Un endpoint caído da errores idénticos a un modelo que no contesta: se
  // chequea antes para no confundir las dos cosas.
  const ping = await fetch(`${API}/prep?resource=diagnostic-aggregates&kind=concepts&q=test`).catch(
    () => null
  );
  if (!ping?.ok) throw new Error(`El endpoint local no responde en ${API}. ¿Corriste "npm run dev:api"?`);

  const records: RunRecord[] = [];
  for (const c of cases) {
    for (let run = 1; run <= runs; run++) {
      process.stderr.write(`\n== ${c.id} · corrida ${run}/${runs}${legacy ? ' (legacy)' : ''}\n`);
      const started = Date.now();
      try {
        const record = await runOnce(c, run, verbose, legacy);
        records.push(record);
        process.stderr.write(
          `   ${record.rounds} vueltas · ${record.requested} pedidas ` +
            `(${record.executed} corridas, ${record.cacheHits} repetidas, ${record.dropped} descartadas) · ` +
            `modelo ${record.modelSec}s · motor ${record.toolSec}s · ` +
            `cifras sin respaldo ${record.grounding.unbacked}/${record.grounding.cited}\n`
        );
        for (const ch of [...record.checks.midio, ...record.checks.dijo]) {
          process.stderr.write(`   ${ch.ok ? '✓' : '✗'} ${ch.label}\n`);
        }
        process.stderr.write(`   → ${record.text.replace(/\n/g, ' ')}\n`);
      } catch (err) {
        process.stderr.write(
          `   FALLÓ tras ${Math.round((Date.now() - started) / 1000)}s: ${
            err instanceof Error ? err.message : String(err)
          }\n`
        );
      }
    }
  }

  process.stdout.write('\n');
  console.table(summarise(records));

  const save = arg('save');
  if (save) {
    fs.mkdirSync(path.dirname(save), { recursive: true });
    fs.writeFileSync(
      save,
      JSON.stringify({ at: new Date().toISOString(), legacy, maxRounds: MAX_ROUNDS, records }, null, 2)
    );
    process.stderr.write(`\nGuardado en ${save}\n`);
  }

  const compare = arg('compare');
  if (compare) {
    const antes = JSON.parse(fs.readFileSync(compare, 'utf8')) as { records: RunRecord[] };
    process.stdout.write(`\nAntes (${compare}):\n`);
    console.table(summarise(antes.records));
    process.stdout.write('\nDespués (esta corrida):\n');
    console.table(summarise(records));
  }
};

await main();
