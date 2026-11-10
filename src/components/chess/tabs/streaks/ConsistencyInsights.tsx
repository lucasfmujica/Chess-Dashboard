import { Card, CardHeader } from '../../../ui';

interface ConsistencyInsightsData {
  consistency: number;
  currentWinStreak: number;
  currentUnbeatenStreak: number;
  currentLossStreak: number;
  gamesThisWeek: number;
}

interface ConsistencyInsightsProps {
  streaksData: ConsistencyInsightsData;
}

const ConsistencyInsights = ({ streaksData }: ConsistencyInsightsProps) => {
  const getFrequencyMessage = () => {
    if (streaksData.consistency >= 75) return 'Jugás con mucha regularidad.';
    if (streaksData.consistency >= 50) return 'Jugás seguido.';
    if (streaksData.consistency >= 25) return 'Jugás de a ratos. Sumá alguna partida más por semana.';
    return 'Poca actividad. Para mejorar hace falta jugar más seguido.';
  };

  const getMomentumMessage = () => {
    if (streaksData.currentWinStreak >= 3) return `${streaksData.currentWinStreak} victorias seguidas.`;
    if (streaksData.currentUnbeatenStreak >= 5) return `${streaksData.currentUnbeatenStreak} partidas sin perder.`;
    if (streaksData.currentLossStreak >= 3) return `${streaksData.currentLossStreak} derrotas seguidas. Revisá las últimas antes de la próxima.`;
    return 'Sin rachas marcadas.';
  };

  const getGoalMessage = () => {
    if (streaksData.gamesThisWeek < 5) return 'Jugá 5 partidas o más esta semana.';
    if (streaksData.currentWinStreak === 0) return 'Apuntá a ganar la próxima.';
    return `Llevá la racha a ${streaksData.currentWinStreak + 1}.`;
  };

  const items = [
    { label: 'Frecuencia', text: getFrequencyMessage() },
    { label: 'Momento', text: getMomentumMessage() },
    { label: 'Próximo paso', text: getGoalMessage() },
  ];

  return (
    <Card>
      <CardHeader title="Lectura" subtitle="Jugar con regularidad es lo que más ayuda a mejorar" />
      <dl className="mt-4 grid grid-cols-1 divide-y divide-hairline rounded border border-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
        {items.map(item => (
          <div key={item.label} className="p-4">
            <dt className="text-label">{item.label}</dt>
            <dd className="mt-1.5 font-serif text-[15px] leading-[22px] text-fg">{item.text}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
};

export default ConsistencyInsights;
