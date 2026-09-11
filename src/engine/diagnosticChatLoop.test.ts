import { describe, it, expect } from 'vitest';
import {
  runDiagnosticChat,
  MAX_PER_ROUND,
  MAX_ROUNDS,
  type ChatToolCall,
  type WireTurn,
} from './diagnosticChatLoop';

const FEN = 'r1bq1rk1/1pp1ppbp/1n1p1np1/8/P2P4/2NQ1NP1/PBP1PPBP/R4RK1 b - - 4 10';

const call = (over: Partial<ChatToolCall> & { id: string }): ChatToolCall => ({
  tool: 'evaluar',
  moves: [],
  ...over,
});

/** Motor de mentira: siempre la misma cifra, y cuenta cuántas veces lo llamaron. */
const fakeEngine = () => {
  const seen: string[] = [];
  return {
    seen,
    scoreOf: async (fen: string, depth: number) => {
      seen.push(fen);
      return { cp: 42, bestMove: 'e7e5', profundidad: depth };
    },
  };
};

/** Un modelo de mentira: devuelve la respuesta guionada de cada vuelta. */
const scripted = (script: { text?: string; toolCalls?: ChatToolCall[] }[]) => {
  const sent: { turns: WireTurn[]; final: boolean }[] = [];
  let i = 0;
  return {
    sent,
    askChat: async (turns: WireTurn[], final: boolean) => {
      // Se copia: el bucle muta el historial y sin la copia todas las entradas
      // del registro apuntarían al mismo array.
      sent.push({ turns: JSON.parse(JSON.stringify(turns)) as WireTurn[], final });
      const step = script[Math.min(i, script.length - 1)];
      i += 1;
      return { text: step.text ?? '', toolCalls: step.toolCalls ?? [] };
    },
  };
};

const noConcepts = async () => [];

describe('runDiagnosticChat', () => {
  it('mide lo que le piden y contesta', async () => {
    const engine = fakeEngine();
    const model = scripted([
      { toolCalls: [call({ id: '1', moves: ['Bf5'] })] },
      { text: 'Bf5 deja +0.4.' },
    ]);
    const result = await runDiagnosticChat([{ role: 'user', text: '¿?' }], new Map(), {
      fen: FEN,
      scoreOf: engine.scoreOf,
      askChat: model.askChat,
      searchConcepts: noConcepts,
    });

    expect(result.text).toBe('Bf5 deja +0.4.');
    expect(result.evaluated).toEqual(['Bf5']);
    expect(result.stats.rounds).toBe(2);
    expect(result.stats.executed).toBe(1);
    expect(result.exhausted).toBe(false);
  });

  it('no vuelve a correr el motor por una medición repetida, y avisa que lo es', async () => {
    const engine = fakeEngine();
    const model = scripted([
      { toolCalls: [call({ id: '1', moves: ['Bf5'] })] },
      { toolCalls: [call({ id: '2', moves: ['Bf5'] })] },
      { text: 'listo' },
    ]);
    const result = await runDiagnosticChat([{ role: 'user', text: '¿?' }], new Map(), {
      fen: FEN,
      scoreOf: engine.scoreOf,
      askChat: model.askChat,
      searchConcepts: noConcepts,
    });

    expect(engine.seen).toHaveLength(1);
    expect(result.stats.cacheHits).toBe(1);
    // La repetida vuelve marcada: es la única señal que le llega al modelo.
    const repeated = model.sent[2].turns.flatMap(t => (t.role === 'tool' ? t.results : []));
    expect(repeated.some(r => r.output.includes('ya_medido'))).toBe(true);
  });

  it('le contesta también las mediciones que descarta por el tope', async () => {
    // Sin esto, un turno del asistente queda con más tool_calls que resultados,
    // que es un historial que las APIs compatibles con OpenAI rechazan.
    const engine = fakeEngine();
    const tooMany = Array.from({ length: MAX_PER_ROUND + 4 }, (_, n) =>
      call({ id: `t${n}`, moves: n === 0 ? [] : ['Bf5'], depth: 10 + n })
    );
    const model = scripted([{ toolCalls: tooMany }, { text: 'listo' }]);
    const result = await runDiagnosticChat([{ role: 'user', text: '¿?' }], new Map(), {
      fen: FEN,
      scoreOf: engine.scoreOf,
      askChat: model.askChat,
      searchConcepts: noConcepts,
    });

    expect(result.stats.dropped).toBe(4);
    const asked = model.sent[1].turns.find(t => t.role === 'assistant');
    const answered = model.sent[1].turns.flatMap(t => (t.role === 'tool' ? t.results : []));
    expect(answered).toHaveLength(tooMany.length);
    expect(asked?.role === 'assistant' && asked.toolCalls).toHaveLength(tooMany.length);
    expect(answered.filter(r => r.isError)).toHaveLength(4);
  });

  it('deja una sola libreta, siempre al final, y no la apila', async () => {
    const engine = fakeEngine();
    const model = scripted([
      { toolCalls: [call({ id: '1', moves: ['Bf5'] })] },
      { toolCalls: [call({ id: '2', moves: ['Nxa4'] })] },
      { text: 'listo' },
    ]);
    await runDiagnosticChat([{ role: 'user', text: '¿?' }], new Map(), {
      fen: FEN,
      scoreOf: engine.scoreOf,
      askChat: model.askChat,
      searchConcepts: noConcepts,
    });

    const ledgers = (turns: WireTurn[]) =>
      turns.filter(t => t.role === 'user' && t.text.includes('Ya medido en este hilo'));
    expect(ledgers(model.sent[1].turns)).toHaveLength(1);
    expect(ledgers(model.sent[2].turns)).toHaveLength(1);
    // Última, y con las dos mediciones adentro.
    const last = model.sent[2].turns[model.sent[2].turns.length - 1];
    expect(last.role).toBe('user');
    expect(last.role === 'user' && last.text).toContain('Bf5');
    expect(last.role === 'user' && last.text).toContain('Nxa4');
  });

  it('en la última vuelta pide la respuesta con las herramientas cerradas', async () => {
    const engine = fakeEngine();
    // Un modelo que nunca para de pedir mediciones.
    const model = scripted([{ toolCalls: [call({ id: 'x', moves: ['Bf5'] })] }]);
    const result = await runDiagnosticChat([{ role: 'user', text: '¿?' }], new Map(), {
      fen: FEN,
      scoreOf: engine.scoreOf,
      askChat: model.askChat,
      searchConcepts: noConcepts,
    });

    expect(result.stats.rounds).toBe(MAX_ROUNDS);
    expect(model.sent.filter(s => s.final)).toHaveLength(1);
    expect(model.sent[MAX_ROUNDS - 1].final).toBe(true);
  });

  it('con --legacy vuelve al comportamiento anterior', async () => {
    const engine = fakeEngine();
    const tooMany = Array.from({ length: MAX_PER_ROUND + 2 }, (_, n) =>
      call({ id: `t${n}`, moves: ['Bf5'], depth: 10 + n })
    );
    const model = scripted([{ toolCalls: tooMany }, { text: 'listo' }]);
    const result = await runDiagnosticChat([{ role: 'user', text: '¿?' }], new Map(), {
      fen: FEN,
      scoreOf: engine.scoreOf,
      askChat: model.askChat,
      searchConcepts: noConcepts,
      legacy: true,
    });

    expect(result.stats.dropped).toBe(2);
    // Las descartadas quedaban sin respuesta, y no había libreta ni cierre.
    const answered = model.sent[1].turns.flatMap(t => (t.role === 'tool' ? t.results : []));
    expect(answered).toHaveLength(MAX_PER_ROUND);
    expect(model.sent.every(s => !s.final)).toBe(true);
    expect(
      model.sent[1].turns.some(t => t.role === 'user' && t.text.includes('Ya medido en este hilo'))
    ).toBe(false);
  });

  it('una jugada ilegal vuelve como error con las jugadas válidas, sin tocar el motor', async () => {
    const engine = fakeEngine();
    const model = scripted([
      { toolCalls: [call({ id: '1', moves: ['Qh4'] })] },
      { text: 'no se puede' },
    ]);
    await runDiagnosticChat([{ role: 'user', text: '¿?' }], new Map(), {
      fen: FEN,
      scoreOf: engine.scoreOf,
      askChat: model.askChat,
      searchConcepts: noConcepts,
    });

    expect(engine.seen).toHaveLength(0);
    const results = model.sent[1].turns.flatMap(t => (t.role === 'tool' ? t.results : []));
    expect(results[0].output).toContain('no es legal');
  });

  it('la ablación devuelve la posición con y sin la pieza', async () => {
    const engine = fakeEngine();
    const model = scripted([
      { toolCalls: [call({ id: '1', tool: 'quitar_pieza', moves: [], square: 'd3' })] },
      { text: 'listo' },
    ]);
    await runDiagnosticChat([{ role: 'user', text: '¿?' }], new Map(), {
      fen: FEN,
      scoreOf: engine.scoreOf,
      askChat: model.askChat,
      searchConcepts: noConcepts,
    });

    expect(engine.seen).toHaveLength(2);
    const results = model.sent[1].turns.flatMap(t => (t.role === 'tool' ? t.results : []));
    expect(results[0].output).toContain('con_la_pieza_cp');
    expect(results[0].output).toContain('sin_la_pieza_cp');
  });

  it('no se puede sacar un rey, y lo dice sin llamar al motor', async () => {
    const engine = fakeEngine();
    const model = scripted([
      { toolCalls: [call({ id: '1', tool: 'quitar_pieza', moves: [], square: 'g8' })] },
      { text: 'listo' },
    ]);
    await runDiagnosticChat([{ role: 'user', text: '¿?' }], new Map(), {
      fen: FEN,
      scoreOf: engine.scoreOf,
      askChat: model.askChat,
      searchConcepts: noConcepts,
    });

    expect(engine.seen).toHaveLength(0);
    const results = model.sent[1].turns.flatMap(t => (t.role === 'tool' ? t.results : []));
    expect(results[0].output).toContain('rey');
  });
});
