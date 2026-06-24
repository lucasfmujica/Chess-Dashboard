/**
 * Geographic data for the "results by city/country" feature.
 * Coordinates are [longitude, latitude] (GeoJSON order).
 */

export interface CityLocation {
  city: string;
  province?: string;
  country: string;
  coordinates: [number, number];
}

/**
 * Directory of cities that can host tournaments. Extend as needed; the
 * Geography tab lets the user assign any of these to a tournament.
 */
export const CITY_DIRECTORY: Record<string, CityLocation> = {
  // Argentina
  'Buenos Aires': { city: 'Buenos Aires', province: 'CABA', country: 'Argentina', coordinates: [-58.3816, -34.6037] },
  'La Plata': { city: 'La Plata', province: 'Buenos Aires', country: 'Argentina', coordinates: [-57.9545, -34.9215] },
  'Mar del Plata': { city: 'Mar del Plata', province: 'Buenos Aires', country: 'Argentina', coordinates: [-57.5575, -38.0055] },
  Rosario: { city: 'Rosario', province: 'Santa Fe', country: 'Argentina', coordinates: [-60.6393, -32.9442] },
  'Santa Fe': { city: 'Santa Fe', province: 'Santa Fe', country: 'Argentina', coordinates: [-60.7, -31.6333] },
  Córdoba: { city: 'Córdoba', province: 'Córdoba', country: 'Argentina', coordinates: [-64.1888, -31.4201] },
  Mendoza: { city: 'Mendoza', province: 'Mendoza', country: 'Argentina', coordinates: [-68.8458, -32.8895] },
  'San Luis': { city: 'San Luis', province: 'San Luis', country: 'Argentina', coordinates: [-66.3356, -33.3017] },
  'Puerto Madryn': { city: 'Puerto Madryn', province: 'Chubut', country: 'Argentina', coordinates: [-65.0386, -42.7692] },
  Trelew: { city: 'Trelew', province: 'Chubut', country: 'Argentina', coordinates: [-65.3051, -43.2489] },
  'Lago Puelo': { city: 'Lago Puelo', province: 'Chubut', country: 'Argentina', coordinates: [-71.5966, -42.0972] },
  'Comodoro Rivadavia': { city: 'Comodoro Rivadavia', province: 'Chubut', country: 'Argentina', coordinates: [-67.5, -45.8667] },
  Bariloche: { city: 'Bariloche', province: 'Río Negro', country: 'Argentina', coordinates: [-71.3103, -41.1335] },
  Neuquén: { city: 'Neuquén', province: 'Neuquén', country: 'Argentina', coordinates: [-68.0591, -38.9516] },
  'San Juan': { city: 'San Juan', province: 'San Juan', country: 'Argentina', coordinates: [-68.5364, -31.5375] },
  Tucumán: { city: 'San Miguel de Tucumán', province: 'Tucumán', country: 'Argentina', coordinates: [-65.2226, -26.8083] },
  Salta: { city: 'Salta', province: 'Salta', country: 'Argentina', coordinates: [-65.4117, -24.7821] },
  // Neighbouring / international
  Montevideo: { city: 'Montevideo', country: 'Uruguay', coordinates: [-56.1645, -34.9011] },
  Santiago: { city: 'Santiago', country: 'Chile', coordinates: [-70.6693, -33.4489] },
  'São Paulo': { city: 'São Paulo', country: 'Brazil', coordinates: [-46.6333, -23.5505] },
  Asunción: { city: 'Asunción', country: 'Paraguay', coordinates: [-57.5759, -25.2637] },
  Madrid: { city: 'Madrid', country: 'Spain', coordinates: [-3.7038, 40.4168] },
};

/** Default tournament -> city assignment for the seed tournaments. */
export const DEFAULT_TOURNAMENT_CITY: Record<string, string> = {
  'IRT Damian Reca': 'Buenos Aires',
  'Torre Blanca': 'Buenos Aires',
  'Masters Ciudad': 'Buenos Aires',
  'IRT Soberanía Nacional': 'Buenos Aires',
  'IRT Carnaval': 'Buenos Aires',
  'Abierto Madryn': 'Puerto Madryn',
  'Abierto Lago Puelo': 'Lago Puelo',
};

/** Sorted list of city keys for selectors. */
export const CITY_OPTIONS = Object.keys(CITY_DIRECTORY).sort((a, b) => a.localeCompare(b));
