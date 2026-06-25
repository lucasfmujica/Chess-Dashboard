// Generates public/data/openingsBook.json from the Lichess chess-openings
// dataset: a map of position EPD (FEN's first 4 fields) -> "ECO\tName".
// Served as a static asset (lazy-fetched at runtime), not bundled into the JS.
//
// Run with network access:  node scripts/gen-openings.mjs
import { Chess } from 'chess.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master/';
const FILES = ['a', 'b', 'c', 'd', 'e'];

const epdOf = (fen) => fen.split(' ').slice(0, 4).join(' ');

const map = {};
let rows = 0;

for (const f of FILES) {
  const res = await fetch(BASE + f + '.tsv');
  if (!res.ok) throw new Error(`Failed to fetch ${f}.tsv: ${res.status}`);
  const text = await res.text();
  const lines = text.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const [eco, name, pgn] = line.split('\t');
    if (!pgn) continue;
    const chess = new Chess();
    try {
      chess.loadPgn(pgn);
    } catch {
      continue;
    }
    rows++;
    // Longer lines overwrite shorter transpositions to the same EPD; that's fine
    // since the deepest naming for a position is the most specific.
    map[epdOf(chess.fen())] = `${eco}\t${name}`;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '..', 'public', 'data', 'openingsBook.json');
writeFileSync(out, JSON.stringify(map));
console.log(`Parsed ${rows} opening lines -> ${Object.keys(map).length} unique positions`);
console.log(`Wrote ${out}`);
