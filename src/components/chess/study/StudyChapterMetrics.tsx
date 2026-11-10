import { useMemo, type ReactNode } from 'react';
import { ClockBar, StatCard } from '../../ui';
import {
  chapterReview,
  formatPoints,
  linkGamesToChapter,
  scoreGames,
} from '../../../utils/studyChapterLinks';
import type { StudyChapter } from '../../../utils/studyPgn';
import type { Game, RepertoireMove } from '../../../types/chess';

interface StudyChapterMetricsProps {
  chapter: StudyChapter;
  /** Partidas propias, ya filtradas por la fuente del encabezado. */
  games: Game[];
  /** Jugadas de repertorio; null mientras cargan o si la API falló. */
  moves: RepertoireMove[] | null;
  movesError?: string | null;
  /** Fijado al montar, igual que el entrenador: no reordena a mitad de sesión. */
  now: number;
}

const COLOR_LABEL = { W: 'con blancas', B: 'con negras' } as const;

/**
 * Las dos medidas del capítulo abierto, en la planilla: cómo te fue en tus
 * partidas con esta apertura y cuánto de su repertorio toca repasar hoy.
 */
const StudyChapterMetrics = ({ chapter, games, moves, movesError, now }: StudyChapterMetricsProps) => {
  const link = useMemo(() => linkGamesToChapter(chapter.header, games), [chapter, games]);
  const score = useMemo(() => scoreGames(link.games), [link]);
  const review = useMemo(() => (moves ? chapterReview(chapter, moves, now) : null), [chapter, moves, now]);

  const lineValue = score.total ? (
    <>
      {formatPoints(score.points)}
      <span className="text-fg-subtle">/{score.total}</span>
    </>
  ) : (
    '—'
  );

  const extras =
    (link.noPgn.length ? ` · ${link.noPgn.length} sin PGN` : '') +
    (link.unassigned.length ? ` · ${link.unassigned.length} sin asignar` : '');

  const lineSubtitle = score.total ? (
    <>
      <span className="font-mono tabular-nums">{score.pct}%</span>
      {' · '}
      <span className="font-mono tabular-nums">
        <span className="text-win">+{score.wins}</span> <span className="text-draw">={score.draws}</span>{' '}
        <span className="text-loss">−{score.losses}</span>
      </span>
      {link.color && ` · ${COLOR_LABEL[link.color]}`}
      {extras}
    </>
  ) : link.method === null ? (
    'Sin partidas vinculadas: el capítulo no trae ECO ni apertura'
  ) : (
    `Sin partidas vinculadas${link.color ? ` ${COLOR_LABEL[link.color]}` : ''} en ${
      link.method === 'opening' ? 'esta apertura' : chapter.header.eco
    }${link.method === 'tiebreak' ? ' (desempate por jugadas)' : ''}${extras}`
  );

  let reviewValue: ReactNode = '—';
  let reviewSubtitle: ReactNode = 'Cargando el repertorio…';
  if (movesError) {
    reviewSubtitle = 'No se pudo leer el repertorio';
  } else if (review) {
    if (review.method === null) {
      reviewSubtitle = 'Sin jugadas de repertorio vinculadas';
    } else {
      reviewValue = review.due;
      reviewSubtitle = review.due
        ? `vencidas hoy, de ${review.total} jugadas`
        : `al día, ${review.total} jugadas`;
    }
  }

  return (
    <ClockBar>
      <StatCard title="Con esta línea" value={lineValue} subtitle={lineSubtitle} className="px-4 py-3" />
      <StatCard title="Repaso" value={reviewValue} subtitle={reviewSubtitle} className="px-4 py-3" />
    </ClockBar>
  );
};

export default StudyChapterMetrics;
