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
    // Frame around the markers (with margin) or default to South America.
    let region: Feature<Polygon>;
    if (markers.length > 0) {
      const lngs = markers.map(m => m.coordinates[0]);
      const lats = markers.map(m => m.coordinates[1]);
      const margin = 9;
      region = bboxRegion(
        Math.min(...lngs) - margin,
        Math.min(...lats) - margin,
        Math.max(...lngs) + margin,
        Math.max(...lats) + margin
      );
    } else {
      region = bboxRegion(-74, -56, -52, -20); // Argentina-ish
    }
    proj.fitExtent([[PAD, PAD], [WIDTH - PAD, HEIGHT - PAD]], region);
    return { pathFor: geoPath(proj), projection: proj };
  }, [markers]);

  const maxTotal = Math.max(1, ...markers.map(m => m.total));
  const radius = (total: number) => 6 + (total / maxTotal) * 16;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label="World map of tournament locations">
        {/* Country shapes */}
        <g>
          {worldFeatures.features.map((f, i) => (
            <path
              key={i}
              d={pathFor(f) || undefined}
              fill="rgb(var(--surface-2))"
              stroke="rgb(var(--border))"
              strokeWidth={0.5}
            />
          ))}
        </g>

        {/* City markers */}
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
                className="cursor-pointer"
              >
                <circle
                  r={r}
                  fill="rgb(var(--accent))"
                  fillOpacity={isHovered ? 0.95 : 0.7}
                  stroke="rgb(var(--accent))"
                  strokeWidth={isHovered ? 2 : 1}
                />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  className="select-none"
                  fill="rgb(var(--accent-fg))"
                  fontSize={Math.min(13, r)}
                  fontWeight={600}
                >
                  {m.total}
                </text>
                {isHovered && (
                  <g transform={`translate(0, ${-r - 8})`}>
                    <text
                      textAnchor="middle"
                      fill="rgb(var(--fg))"
                      fontSize={13}
                      fontWeight={600}
                      paintOrder="stroke"
                      stroke="rgb(var(--surface))"
                      strokeWidth={4}
                    >
                      {m.city} · {m.winRate}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      {markers.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-fg-muted">
          No located games yet — assign cities to your tournaments below.
        </p>
      )}
    </div>
  );
};

export default GeoMap;
