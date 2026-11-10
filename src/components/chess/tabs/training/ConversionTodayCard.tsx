import { useMemo } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { Card } from '../../../ui';
import { CONVERSION_IDS } from '../../../../constants/conversionIds';
import useLocalStorage from '../../../../hooks/useLocalStorage';
import { PROGRESS_KEY, conversionStats, type ProgressMap } from '../../../../utils/conversionProgress';

interface ConversionTodayCardProps {
  onOpen: () => void;
}

/**
 * Tarjeta-link de Hoy hacia Ejercicios → Conversión. La cola de conversión y
 * guías no entra en la cuota diaria (`QueueQuota` y `useDailyQueue` no cambian):
 * acá solo se avisa cuántas hay para hoy.
 *
 * No hace fetch: cuenta con el progreso local (localStorage) y, si no hay,
 * muestra el total como no vistas. Tampoco carga las posiciones: usa la lista
 * de ids (`constants/conversionIds`), así el chunk `conversion-data` solo baja
 * al abrir la pestaña Conversión. El progreso de otro dispositivo aparece ahí.
 */
const ConversionTodayCard = ({ onOpen }: ConversionTodayCardProps) => {
  const [progress] = useLocalStorage<ProgressMap>(PROGRESS_KEY, {});
  const due = useMemo(() => conversionStats(CONVERSION_IDS, progress, Date.now()).due, [progress]);

  return (
    <Card interactive flush>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="font-serif text-base text-fg">
          Conversión y drills:{' '}
          <span className="font-mono font-medium tabular-nums text-accent">
            {due}
          </span>{' '}
          para hoy
        </span>
        <ArrowRightIcon className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
      </button>
    </Card>
  );
};

export default ConversionTodayCard;
