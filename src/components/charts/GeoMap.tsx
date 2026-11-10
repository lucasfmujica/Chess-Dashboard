import { useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson';
import countries110m from 'world-atlas/countries-110m.json';
import type { CityStats } from '../../hooks/useGeographyStats';

const WIDTH = 800;
const HEIGHT = 520;
const PAD = 24;

// world-atlas topology -> GeoJSON feature collection (typed loosely; it's JSON).
const worldFeatures = feature(
  countries110m as unknown as Parameters<typeof feature>[0],
  (countries110m as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries
) as unknown as FeatureCollection<Geometry>;

/** Rectangle polygon feature used to frame the projection around the data. */
const bboxRegion = (minLng: number, minLat: number, maxLng: number, maxLat: number): Feature<Polygon> => ({
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat],
    ]],
  },
});

interface GeoMapProps {
  markers: CityStats[];
}

const GeoMap = ({ markers }: GeoMapProps) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const { pathFor, projection } = useMemo(() => {
    const proj = geoMercator();
    const extent: [[number, number], [number, number]] = [[PAD, PAD], [WIDTH - PAD, HEIGHT - PAD]];

    if (markers.length > 0) {
      const lngs = markers.map(m => m.coordinates[0]);
      const lats = markers.map(m => m.coordinates[1]);
      const centroid: [number, number] = [
        lngs.reduce((a, b) => a + b, 0) / lngs.length,
        lats.reduce((a, b) => a + b, 0) / lats.length,
      ];
      // Derive a base scale that tightly fits the marker points, then back off for
      // breathing room and clamp so a tight cluster doesn't zoom to street level.
      const points: FeatureCollection<Geometry> = {
        type: 'FeatureCollection',
        features: markers.map(m => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: m.coordinates } })),
      };
      proj.fitExtent(extent, points);
      const fitted = proj.scale();
      const scale = Math.min(Math.max(fitted * 0.5, 130), 1500);
      proj.scale(scale).center(centroid).translate([WIDTH / 2, HEIGHT / 2]);
    } else {
      proj.fitExtent(extent, bboxRegion(-74, -56, -52, -20)); // Argentina-ish default
    }
    return { pathFor: geoPath(proj), projection: proj };
  }, [markers]);

  const maxTotal = Math.max(1, ...markers.map(m => m.total));
  // Area, not radius, tracks the game count.
  const radius = (total: number) => 4 + Math.sqrt(total / maxTotal) * 12;
  const label = `Mapa de sedes: ${markers.map(m => `${m.city} ${m.total} partidas`).join(', ') || 'sin sedes'}`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={label}>
        <g>
          {worldFeatures.features.map((f, i) => (
            <path
              key={i}
              d={pathFor(f) || undefined}
              fill="rgb(var(--surface-2))"
              stroke="rgb(var(--border))"
              strokeWidth={0.75}
            />
          ))}
        </g>

        <g>
          {markers.map(m => {
            const xy = projection(m.coordinates);
            if (!xy) return null;
            const isHovered = hovered === m.key;
            const r = radius(m.total);
            return (
              <g
                key={m.key}
                transform={`translate(${xy[0]}, ${xy[1]})`}
                onMouseEnter={() => setHovered(m.key)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-default"
              >
                <title>{`${m.city}: ${m.total} partidas · ${m.score}`}</title>
                <circle
                  r={r}
                  fill="rgb(var(--accent))"
                  fillOpacity={isHovered ? 1 : 0.85}
                  stroke="rgb(var(--surface))"
                  strokeWidth={1.5}
                />
                <text
                  x={r + 6}
                  dy="0.35em"
                  className="select-none font-serif"
                  fill="rgb(var(--fg))"
                  fontSize={15}
                  paintOrder="stroke"
                  stroke="rgb(var(--surface))"
                  strokeWidth={4}
                  strokeLinejoin="round"
                >
                  {m.city}
                  <tspan className="font-mono" fill="rgb(var(--fg-muted))" fontSize={12} dx={6}>
                    {isHovered ? `${m.total} P · ${m.score}` : m.total}
                  </tspan>
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      {markers.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-fg-muted">
          Todavía no hay partidas ubicadas: asigná ciudades a tus torneos más abajo.
        </p>
      )}
    </div>
  );
};

export default GeoMap;
