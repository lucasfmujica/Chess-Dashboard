import type { TrainingBlock } from '../types/training';
import { weekdayIndex } from '../utils/localDate';
import planFinalPayload from './planFinalPayload.json';

/**
 * The weekly training program: which block runs on which weekday, and how
 * many exercises of each kind the daily queue should serve.
 *
 * This is *config*, not data. Only what actually happened is persisted (the
 * `training_sessions` table) — the plan lives here so that plan-vs-actual is
 * a comparison against a fixed reference rather than against another mutable
 * record that drifts to match whatever was done.
 *
 * Built around ~30 min/day with the class day kept deliberately light, on the
 * principle that the constraint is consistency, not volume.
 */

/** How many queue items of each kind a day's session should serve. */
export interface QueueQuota {
  blunder: number;
  endgame: number;
  repertoire: number;
  /**
   * Single moves of the study, played on a board. Separate from `repertoire`
   * (whole chapters, recalled as text) because they are different exercises at
   * different rhythms: a plan is worth revisiting monthly, a move order that
   * already cost a game is worth revisiting this week.
   */
  repertoireMove: number;
  /**
   * Studied concepts recalled against their own position. The Friday block has
   * always been "read Silman, then create a concept row"; without a quota here
   * nothing ever asked for one back.
   */
  concept: number;
}

export interface ProgramBlock {
  block: TrainingBlock;
  minutes: number;
  label: string;
  detail: string;
}

export interface ProgramDay {
  /** 0 = Monday … 6 = Sunday, matching utils/localDate weekdayIndex. */
  weekday: number;
  dayName: string;
  blocks: ProgramBlock[];
  quota: QueueQuota;
  /** Shown as the day's single instruction when there is nothing to drill. */
  focus: string;
  /**
   * Whether the day counts toward the "blocks completed / 6" metric.
   * Tuesday is false: the classes are the coaches' time, and the 10 minutes
   * of loading notes afterwards is admin, not training. Counting it would
   * make the headline number flatter by rewarding the easiest day.
   */
  isTrainingDay: boolean;
}

const NO_QUEUE: QueueQuota = { blunder: 0, endgame: 0, repertoire: 0, repertoireMove: 0, concept: 0 };

/**
 * The 5 minutes of Studer appended to the short weekdays. Deliberately last
 * in the day and deliberately tiny — the course sat at 26% because it was
 * being treated as a session of its own rather than a tail on an existing one.
 */
const STUDER_TAIL: ProgramBlock = {
  block: 'concept',
  minutes: 5,
  label: 'Studer, 1 lección',
  detail: 'Orden de módulos: 12 (proceso de pensamiento) → 14 (decisiones) → 13 (reloj) → 7 (finales).',
};

export const trainingProgram: ProgramDay[] = [
  {
    weekday: 0,
    dayName: 'Lunes',
    focus: 'Cálculo escrito',
    quota: { blunder: 5, endgame: 0, repertoire: 0, repertoireMove: 0, concept: 0 },
    isTrainingDay: true,
    blocks: [
      {
        block: 'calculation',
        minutes: 25,
        label: 'Cálculo escrito',
        detail:
          '5 blunder drills de la cola. Candidatos en papel antes de mover (jaques, capturas, una amenaza tranquila), bote salvavidas marcado, evaluación en una palabra al final de cada línea. Después pasalos al cuadro de la app; la foto del papel va a Juan Cruz.',
      },
      STUDER_TAIL,
    ],
  },
  {
    weekday: 1,
    dayName: 'Martes',
    focus: 'Clases',
    quota: NO_QUEUE,
    isTrainingDay: false,
    blocks: [
      {
        block: 'lesson',
        minutes: 10,
        label: 'Clases + carga',
        detail:
          'Clase con Toto y con Juan Cruz. Después sólo 10 minutos para cargar el recap, las posiciones y la tarea que te dieron. No entrenes más este día.',
      },
    ],
  },
  {
    weekday: 2,
    dayName: 'Miércoles',
    focus: 'Finales de torre',
    quota: { blunder: 0, endgame: 4, repertoire: 0, repertoireMove: 0, concept: 0 },
    isTrainingDay: true,
    blocks: [
      {
        block: 'endgame',
        minutes: 15,
        label: 'De la Villa, 15 variantes',
        detail:
          'Empezá por los capítulos de torre, no por el principio: Philidor, Lucena, Vancura, torre y peón de torre, 4 contra 3 mismo flanco.',
      },
      {
        block: 'endgame',
        minutes: 10,
        label: 'Endgame drills',
        detail: 'Finales de torre de tus propias partidas, de la cola.',
      },
      STUDER_TAIL,
    ],
  },
  {
    weekday: 3,
    dayName: 'Jueves',
    focus: 'Jugar',
    quota: NO_QUEUE,
    isTrainingDay: true,
    blocks: [
      {
        block: 'play',
        minutes: 25,
        label: 'Una partida 15+10',
        detail:
          'Objetivo de proceso único: antes de cada jugada no forzada, "¿cuál es su mejor respuesta, y la vi?".',
      },
      {
        block: 'analysis',
        minutes: 5,
        label: 'Análisis propio',
        detail:
          'Analizá vos primero, antes de abrir el motor. La partida no cuenta como jugada hasta que tiene su fila en Game Library.',
      },
    ],
  },
  {
    weekday: 4,
    dayName: 'Viernes',
    focus: 'Conceptos',
    // The day was creating concepts and never revisiting them. Four back is
    // small enough to leave the reading block intact. The 3 blunders make the
    // paper calculation every other day that Juan Cruz asks for (Lun/Vie/Sáb).
    quota: { blunder: 3, endgame: 0, repertoire: 0, repertoireMove: 0, concept: 4 },
    isTrainingDay: true,
    blocks: [
      {
        block: 'calculation',
        minutes: 15,
        label: 'Cálculo en papel',
        detail:
          '3 blunder drills de la cola, mismo método que el lunes: candidatos en papel primero, después al cuadro de la app.',
      },
      {
        block: 'concept',
        minutes: 25,
        label: 'Silman, 15 variantes',
        detail:
          'Primero repasá los conceptos en estudio que vuelven de la cola (al principio no hay ninguno), después elegí 1 concepto nuevo y creá su fila en Concepts, con la partida tuya donde apareció y una línea escrita por vos. Un concepto sin partida propia no se aprendió.',
      },
      STUDER_TAIL,
    ],
  },
  {
    weekday: 5,
    dayName: 'Sábado',
    focus: 'Bloque largo',
    quota: { blunder: 3, endgame: 0, repertoire: 0, repertoireMove: 0, concept: 0 },
    isTrainingDay: true,
    blocks: [
      {
        block: 'play',
        minutes: 30,
        label: 'Partida larga',
        detail: '30 minutos o más. Si no hay partida disponible, Fischer.',
      },
      {
        block: 'calculation',
        minutes: 15,
        label: 'Cálculo en papel',
        detail: '3 blunder drills de la cola. Candidatos en papel primero, después al cuadro de la app.',
      },
      {
        block: 'analysis',
        minutes: 30,
        label: 'Análisis completo',
        detail:
          'Con fila en Game Library: FEN del momento crítico, tu jugada, la mejor, tipo de error y una línea de lección.',
      },
    ],
  },
  {
    weekday: 6,
    dayName: 'Domingo',
    focus: 'Repertorio y revisión',
    // Weighted toward the moves: 2 chapter plans and 8 single moves fit the
    // same 20 minutes, and the moves are where the losses actually come from.
    quota: { blunder: 0, endgame: 0, repertoire: 2, repertoireMove: 8, concept: 0 },
    isTrainingDay: true,
    blocks: [
      {
        block: 'repertoire',
        minutes: 20,
        label: 'Repertorio o tarea de Toto',
        detail:
          'Semanas alternas. Una semana la cola: las jugadas primero, en el tablero, y sólo después los planes de las líneas con menor confianza. La otra, la tarea de Toto con la Benoni (A61) y la cola se saltea.',
      },
      {
        block: 'analysis',
        minutes: 10,
        label: 'Revisión semanal',
        detail:
          '¿Cuántos bloques cumplí de 6? ¿Qué proporción de fallos fue candidato perdido? ¿Qué reemplazo si algo cerró?',
      },
    ],
  },
];

/** Days that count toward the weekly blocks metric (everything but Tuesday). */
export const trainingDays = trainingProgram.filter(d => d.isTrainingDay);

/** The denominator of the "blocks completed / N" headline metric. */
export const WEEKLY_BLOCK_TARGET = trainingDays.length;

/** Annotated games expected per week — the plan's third monthly metric. */
export const WEEKLY_ANNOTATION_TARGET = 2;

export const programForWeekday = (weekday: number): ProgramDay =>
  trainingProgram[((weekday % 7) + 7) % 7];

/**
 * Segundo's final sub-2000 plan. Inside this window (inclusive) Hoy and Semana
 * show the plan's day instead of the recurring weekly program.
 *
 * Every date key here is a calendar day in America/Buenos_Aires, compared as a
 * plain 'YYYY-MM-DD' string — never converted through UTC, so there is no
 * shift at the edges. Callers get their key from `localDateKey`, which is the
 * viewer's local day (ART for this app).
 */
export const PLAN_FINAL_FROM = '2026-11-10';
export const PLAN_FINAL_TO = '2026-12-04';

interface PlanFinalActivity {
  id: string;
  minutes: number;
  label: string;
  details: string;
}

interface PlanFinalDay {
  tipo: string;
  note: string;
  activities: PlanFinalActivity[];
}

const planFinalDays = planFinalPayload.days as Record<string, PlanFinalDay>;

/**
 * Plan activity id → the block it ticks. `drills` is `calculation` rather than
 * `tactics`: that is what the base program already uses for the blunder
 * drills, and nothing else in the app logs or serves a `tactics` block.
 */
const planBlock = (id: string): TrainingBlock | null => {
  if (id === 'drills' || id === 'calculo-papel') return 'calculation';
  if (id === 'clase-jc') return 'lesson';
  if (id === 'final-4v3' || id === 'finales-app' || id === 'finales-torres') return 'endgame';
  if (id.startsWith('cap-') || id === 'repaso-caps' || id === 'dominacion') return 'repertoire';
  if (id === 'posiciones-otb' || id === 'analisis' || id === 'analisis-sim') return 'analysis';
  if (id === 'partida-larga' || /^sim-r\d$/.test(id)) return 'play';
  // rutina-torneo: no training to tick.
  return null;
};

const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Sentences worth keeping in the headline even when they trail the first one:
 * Hoy and Semana show the focus and block labels but not every block detail
 * (Semana shows no detail at all), so these would otherwise vanish.
 */
const PLAN_FOCUS_KEEP = /resumen semanal|último día|\bbye|comida y descanso|nada nuevo/i;

/**
 * The note's headline ("T · Táctica y cálculo"): its first sentence plus any
 * trailing sentence that carries a deadline or instruction (PLAN_FOCUS_KEEP).
 * Splits on '. ' but not after the abbreviations "Cap." / "caps.", which are
 * not sentence ends ("F · Cap. 01 y 03 …").
 */
const planFocus = (note: string): string => {
  const sentences = note.split(/(?<!\b[Cc]aps?)\.\s+/).map(s => s.replace(/\.$/, ''));
  const kept = sentences.slice(1).filter(s => PLAN_FOCUS_KEEP.test(s));
  return [sentences[0], ...kept].join('. ');
};

const buildPlanDay = (dateKey: string, day: PlanFinalDay): ProgramDay => {
  const blocks: ProgramBlock[] = [];
  for (const a of day.activities) {
    const block = planBlock(a.id);
    if (block) blocks.push({ block, minutes: a.minutes, label: a.label, detail: a.details });
  }
  const ids = day.activities.map(a => a.id);
  const hasDrills = ids.includes('drills');
  // ~10 drills on a normal day; 5 on rest days (drills only) and "liviana"
  // days so the queue stays light — unless the plan states the count: a
  // 10-minute drills block or a label/note saying "10 drills" (30/11, 2/12)
  // wins over the lightness heuristic.
  //
  // 21/11 (descanso, "Solo 20 min de drills") stays at 5 on purpose. The payload
  // fixes no count there; 5 is Atlas's pick for a light rest day, about half a
  // normal drills block. It is not a payload error.
  const drills = day.activities.find(a => a.id === 'drills');
  const statesTen = !!drills && (drills.minutes === 10 || /\b10 drills\b/i.test(`${drills.label} ${day.note}`));
  const light = !statesTen && (ids.every(id => id === 'drills') || day.tipo.includes('liviana'));
  const quota: QueueQuota = {
    ...NO_QUEUE,
    blunder: hasDrills ? (light ? 5 : 10) : 0,
    endgame: blocks.some(b => b.block === 'endgame') ? 1 : 0,
    repertoire: blocks.some(b => b.block === 'repertoire') ? 1 : 0,
  };
  const weekday = weekdayIndex(dateKey);
  return {
    weekday,
    dayName: WEEKDAY_NAMES[weekday],
    focus: planFocus(day.note),
    blocks,
    quota,
    isTrainingDay: blocks.length > 0,
  };
};

const planFinalProgram: Record<string, ProgramDay> = Object.fromEntries(
  Object.entries(planFinalDays).map(([dateKey, day]) => [dateKey, buildPlanDay(dateKey, day)])
);

/** Whether a 'YYYY-MM-DD' (ART) key falls inside the plan-final window, inclusive. */
export const isPlanFinalDate = (dateKey: string): boolean =>
  dateKey >= PLAN_FINAL_FROM && dateKey <= PLAN_FINAL_TO;

/**
 * The program for one concrete day: Segundo's plan inside the window, the
 * recurring weekday program everywhere else.
 */
export const programForDate = (dateKey: string): ProgramDay =>
  (isPlanFinalDate(dateKey) && planFinalProgram[dateKey]) ||
  programForWeekday(weekdayIndex(dateKey));

/** Total planned minutes for a weekday. */
export const plannedMinutes = (day: ProgramDay): number =>
  day.blocks.reduce((sum, b) => sum + b.minutes, 0);

/** Total queue items a weekday asks for. */
export const quotaTotal = (quota: QueueQuota): number =>
  quota.blunder + quota.endgame + quota.repertoire + quota.repertoireMove + quota.concept;

/**
 * Queue items the whole week asks for — the denominator for weekly volume.
 * Derived from the same quotas the daily queue is built from, so changing the
 * program moves the target automatically.
 */
export const WEEKLY_QUEUE_TARGET = trainingProgram.reduce(
  (sum, day) => sum + quotaTotal(day.quota),
  0
);

/** Distinct blocks a weekday prescribes, in order, without duplicates. */
export const blocksForDay = (day: ProgramDay): TrainingBlock[] =>
  [...new Set(day.blocks.map(b => b.block))];
