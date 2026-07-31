import { ecoNames } from '../constants/ecoNames';
import { pgnResultTag } from './gameMapping';
import type { Game } from '../types/chess';

/** Triggers a browser download for arbitrary text content. */
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/** Reconstructs a PGN header block (+ stored movetext, if any) for one game. */
const gameToPgnBlock = (game: Game): string => {
  const white = game.color === 'W' ? 'You' : game.opp;
  const black = game.color === 'W' ? game.opp : 'You';
  const result = pgnResultTag(game);

  const headers = [
    `[Event "${(game.tournament || '?').replace(/"/g, "'")}"]`,
    `[Date "${game.date || '????.??.??'}"]`,
    `[White "${white.replace(/"/g, "'")}"]`,
    `[Black "${black.replace(/"/g, "'")}"]`,
    `[Result "${result}"]`,
    game.eco ? `[ECO "${game.eco}"]` : null,
  ].filter(Boolean);

  const movetext = game.pgn ? game.pgn.trim() : result;
  return `${headers.join('\n')}\n\n${movetext}`;
};

/** Serializes games to a single multi-game PGN file. Games without moves still emit a valid header-only block. */
export const gamesToPGN = (games: Game[]): string => games.map(gameToPgnBlock).join('\n\n\n');

const csvEscape = (value: string | number): string => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const CSV_COLUMNS = ['date', 'tournament', 'color', 'opponent', 'opponent_elo', 'result', 'eco', 'opening', 'elo', 'elo_change', 'source'] as const;

/** Serializes games to CSV, one row per game. */
export const gamesToCSV = (games: Game[]): string => {
  const rows = games.map(g =>
    [
      g.date || '',
      g.tournament || '',
      g.color === 'W' ? 'White' : 'Black',
      g.opp || '',
      g.opp_elo || '',
      g.result,
      g.eco || '',
      g.opening || ecoNames[g.eco] || '',
      g.elo,
      g.eloChange ?? '',
      g.source || 'otb',
    ]
      .map(csvEscape)
      .join(',')
  );
  return [CSV_COLUMNS.join(','), ...rows].join('\n');
};
