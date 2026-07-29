import type { TrainingBlock } from '../types/training';

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

const NO_QUEUE: QueueQuota = { blunder: 0, endgame: 0, repertoire: 0 };

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
    quota: { blunder: 5, endgame: 0, repertoire: 0 },
    isTrainingDay: true,
    blocks: [
      {
        block: 'calculation',
        minutes: 25,
        label: 'Cálculo escrito',
        detail:
          '5 blunder drills de la cola. Candidatos escritos antes de mover (jaques, capturas, una amenaza tranquila), bote salvavidas marcado, evaluación en una palabra al final de cada línea.',
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
    quota: { blunder: 0, endgame: 4, repertoire: 0 },
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
    quota: NO_QUEUE,
    isTrainingDay: true,
    blocks: [
      {
        block: 'concept',
        minutes: 25,
        label: 'Silman, 15 variantes',
        detail:
          'Después elegí 1 concepto del día y creá su fila en Concepts, con la partida tuya donde apareció y una línea escrita por vos. Un concepto sin partida propia no se aprendió.',
      },
      STUDER_TAIL,
    ],
  },
  {
    weekday: 5,
    dayName: 'Sábado',
    focus: 'Bloque largo',
    quota: { blunder: 3, endgame: 0, repertoire: 0 },
    isTrainingDay: true,
    blocks: [
      {
        block: 'play',
        minutes: 30,
        label: 'Partida larga',
        detail: '30 minutos o más. Si no hay partida disponible, Fischer.',
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
    quota: { blunder: 0, endgame: 0, repertoire: 6 },
    isTrainingDay: true,
    blocks: [
      {
        block: 'repertoire',
        minutes: 20,
        label: 'Repertorio',
        detail: 'Sólo las líneas con menor confianza.',
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

/** Total planned minutes for a weekday. */
export const plannedMinutes = (day: ProgramDay): number =>
  day.blocks.reduce((sum, b) => sum + b.minutes, 0);

/** Total queue items a weekday asks for. */
export const quotaTotal = (quota: QueueQuota): number =>
  quota.blunder + quota.endgame + quota.repertoire;

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
