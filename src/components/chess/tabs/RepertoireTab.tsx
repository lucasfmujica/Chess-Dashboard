import OpeningComparisonChart from '../../charts/OpeningComparisonChart';
import OpeningHeroesGallery from './repertoire/OpeningHeroesGallery';
import RepertoireMatchPanel from './repertoire/RepertoireMatchPanel';
import ModelGamesSection from './repertoire/ModelGamesSection';
import type { Repertoire } from '../../../types/chess';
import { Badge, Card, CardHeader, Table, THead, TBody, TR, TH, TD } from '../../ui';

interface OpeningRecommendation {
  type?: string;
  opening: string;
  eco: string;
  reason: string;
  priority: 'high' | 'medium';
}

interface AnalyzedOpening {
  eco: string;
  name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  isMain: boolean;
  needsWork: boolean;
}

interface OpeningRepertoireAnalysis {
  white: AnalyzedOpening[];
  black: AnalyzedOpening[];
}

type OpeningHeroes = Record<string, string[]>;

interface RepertoireTabProps {
  openingRecommendations: OpeningRecommendation[];
  openingRepertoireAnalysis: OpeningRepertoireAnalysis;
  mainRepertoire: Repertoire;
  setMainRepertoire: (value: Repertoire) => Promise<void>;
  openingHeroes: OpeningHeroes;
  setOpeningHeroes: (value: OpeningHeroes) => Promise<void>;
  /** Rated games with no ECO — excluded from the tables, stated below them. */
  gamesWithoutEco: number;
}

interface ColorRepertoireProps {
  title: string;
  hint: string;
  openings: AnalyzedOpening[];
  onToggle: (eco: string) => void;
}

/** One color's openings: the toggles that mark the main lines, then the record. */
const ColorRepertoire = ({ title, hint, openings, onToggle }: ColorRepertoireProps) => (
  <Card>
    <CardHeader title={title} subtitle={`${openings.length} aperturas jugadas`} className="mb-4" />
    <div className="mb-4">
      <p className="mb-2 text-sm text-fg-muted">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {openings.slice(0, 8).map(opening => {
          const on = opening.isMain;
          return (
            <button
              key={opening.eco}
              onClick={() => onToggle(opening.eco)}
              aria-pressed={on}
              className={`rounded-sm border px-2 py-0.5 font-mono text-xs tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                on ? 'border-transparent bg-accent/10 text-accent' : 'border-hairline text-fg-muted hover:border-fg-subtle hover:text-fg'
              }`}
            >
              {opening.eco}
            </button>
          );
        })}
      </div>
    </div>
    <Table>
      <THead>
        <TR>
          <TH>Apertura</TH>
          <TH align="right">Partidas</TH>
          <TH align="right">+ = −</TH>
          <TH align="right">%</TH>
          <TH align="right">Estado</TH>
        </TR>
      </THead>
      <TBody>
        {openings.map(opening => (
          <TR key={opening.eco} className={opening.isMain ? 'bg-accent/5' : ''}>
            <TD>
              <div className="font-serif text-[15px] text-fg">{opening.name}</div>
              <div className="font-mono text-xs text-fg-subtle">{opening.eco}</div>
            </TD>
            <TD align="right" className="font-mono">{opening.games}</TD>
            <TD align="right" muted className="whitespace-nowrap font-mono">
              {opening.wins} {opening.draws} {opening.losses}
            </TD>
            <TD align="right" className={`font-mono ${opening.winRate >= 50 ? 'text-win' : 'text-loss'}`}>
              {opening.winRate}%
            </TD>
            <TD align="right">
              {opening.needsWork ? (
                <Badge tone="loss">A trabajar</Badge>
              ) : opening.isMain ? (
                <Badge tone="accent">Principal</Badge>
              ) : (
                <Badge>Secundaria</Badge>
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  </Card>
);

const RepertoireTab = ({
  openingRecommendations,
  openingRepertoireAnalysis,
  mainRepertoire,
  setMainRepertoire,
  openingHeroes,
  setOpeningHeroes,
  gamesWithoutEco
}: RepertoireTabProps) => {
  const toggle = (color: 'white' | 'black') => (eco: string) => {
    const newRepertoire = { ...mainRepertoire };
    if (newRepertoire[color].includes(eco)) {
      newRepertoire[color] = newRepertoire[color].filter(e => e !== eco);
    } else {
      newRepertoire[color].push(eco);
    }
    setMainRepertoire(newRepertoire);
  };

  return (
    <div className="space-y-6">
      <OpeningComparisonChart white={openingRepertoireAnalysis.white} black={openingRepertoireAnalysis.black} />

      <RepertoireMatchPanel />

      <Card>
        <CardHeader title="Qué revisar" subtitle="Aperturas donde perdés más puntos de los que deberías" className="mb-4" />
        {openingRecommendations.length > 0 ? (
          <ol className="divide-y divide-hairline">
            {openingRecommendations.map((rec, idx) => (
              <li key={idx} className="grid grid-cols-[28px_1fr_auto] gap-2 py-3 first:pt-0 last:pb-0">
                <span className="font-mono text-[13px] leading-6 text-fg-subtle">{idx + 1}</span>
                <div className="min-w-0">
                  <p className="font-serif text-base font-semibold leading-6 text-fg">
                    {rec.opening} <span className="font-mono text-xs font-normal text-fg-subtle">{rec.eco}</span>
                  </p>
                  <p className="mt-0.5 font-serif text-[15px] leading-6 text-fg-muted">{rec.reason}</p>
                </div>
                <Badge tone={rec.priority === 'high' ? 'alert' : 'neutral'} className="self-start">
                  {rec.priority === 'high' ? 'Prioridad alta' : 'Prioridad media'}
                </Badge>
              </li>
            ))}
          </ol>
        ) : (
          <p className="font-serif text-fg-muted">No hay problemas serios: tu repertorio se sostiene.</p>
        )}
      </Card>

      {/* Opening Heroes Section */}
      <OpeningHeroesGallery
        openingHeroes={openingHeroes}
        setOpeningHeroes={setOpeningHeroes}
        whiteOpenings={openingRepertoireAnalysis.white}
        blackOpenings={openingRepertoireAnalysis.black}
      />

      {/* The games behind the names — the gallery was a directory until now. */}
      <ModelGamesSection openingHeroes={openingHeroes} setOpeningHeroes={setOpeningHeroes} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ColorRepertoire
          title="Repertorio con Blancas"
          hint="Aperturas principales (tocá para marcar o desmarcar):"
          openings={openingRepertoireAnalysis.white}
          onToggle={toggle('white')}
        />
        <ColorRepertoire
          title="Repertorio con Negras"
          hint="Defensas principales (tocá para marcar o desmarcar):"
          openings={openingRepertoireAnalysis.black}
          onToggle={toggle('black')}
        />
      </div>

      {/* The games these tables can't classify. Said out loud rather than
          bucketed as an "Unknown" opening, which is what they used to do. */}
      {gamesWithoutEco > 0 && (
        <p className="text-xs text-fg-subtle">
          {gamesWithoutEco} partida{gamesWithoutEco === 1 ? '' : 's'} con rating no
          {gamesWithoutEco === 1 ? ' tiene' : ' tienen'} ECO: vienen de cuadros de torneo, sin jugadas para
          clasificar. Cuentan en tu resultado pero no en estas aperturas. Cargale el PGN a la partida y
          cae en la línea que corresponde.
        </p>
      )}
    </div>
  );
};

export default RepertoireTab;
