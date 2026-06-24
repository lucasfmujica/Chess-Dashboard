import { useMemo } from 'react';
import { calculateGameStats } from '../utils/eloCalculations';
import { CITY_DIRECTORY, DEFAULT_TOURNAMENT_CITY } from '../constants/locations';
import type { CityLocation } from '../constants/locations';
import type { Game } from '../types/chess';

export interface CityStats extends CityLocation {
  /** City directory key. */
  key: string;
  total: number;
  wins: number;
  draws: number;
  losses: number;
  /** Win rate as a number, e.g. 58.3. */
  winRate: number;
  /** Score summary string, e.g. '12.5/20'. */
  score: string;
  performanceRating: number;
  avgOppElo: number;
}

export interface CountryStats {
  country: string;
  cities: number;
  total: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  score: string;
  performanceRating: number;
  avgOppElo: number;
}

export interface GeographyStats {
  byCity: CityStats[];
  byCountry: CountryStats[];
  /** Tournaments that appear in the games but have no resolved city. */
  unmappedTournaments: string[];
  totalLocatedGames: number;
}

/**
 * Resolve the city key for a tournament, preferring user overrides.
 */
export const resolveCityKey = (
  tournament: string,
  overrides: Record<string, string>
): string | undefined => overrides[tournament] || DEFAULT_TOURNAMENT_CITY[tournament];

/**
 * Aggregate game results by city and country for the geography view.
 */
export const useGeographyStats = (
  games: Game[],
  tournamentLocations: Record<string, string>
): GeographyStats =>
  useMemo(() => {
    const gamesByCity: Record<string, Game[]> = {};
    const unmapped = new Set<string>();

    games.forEach(game => {
      const cityKey = resolveCityKey(game.tournament, tournamentLocations);
      if (!cityKey || !CITY_DIRECTORY[cityKey]) {
        unmapped.add(game.tournament);
        return;
      }
      (gamesByCity[cityKey] ||= []).push(game);
    });

    const byCity: CityStats[] = Object.entries(gamesByCity)
      .map(([key, cityGames]) => {
        const stats = calculateGameStats(cityGames);
        return {
          key,
          ...CITY_DIRECTORY[key],
          total: stats.total,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          winRate: parseFloat(stats.winRate),
          score: stats.score,
          performanceRating: stats.performanceRating,
          avgOppElo: stats.avgOppElo,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Country roll-up
    const gamesByCountry: Record<string, Game[]> = {};
    const citiesPerCountry: Record<string, Set<string>> = {};
    Object.entries(gamesByCity).forEach(([key, cityGames]) => {
      const { country } = CITY_DIRECTORY[key];
      (gamesByCountry[country] ||= []).push(...cityGames);
      (citiesPerCountry[country] ||= new Set()).add(key);
    });

    const byCountry: CountryStats[] = Object.entries(gamesByCountry)
      .map(([country, countryGames]) => {
        const stats = calculateGameStats(countryGames);
        return {
          country,
          cities: citiesPerCountry[country].size,
          total: stats.total,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          winRate: parseFloat(stats.winRate),
          score: stats.score,
          performanceRating: stats.performanceRating,
          avgOppElo: stats.avgOppElo,
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      byCity,
      byCountry,
      unmappedTournaments: Array.from(unmapped).sort(),
      totalLocatedGames: byCity.reduce((sum, c) => sum + c.total, 0),
    };
  }, [games, tournamentLocations]);
