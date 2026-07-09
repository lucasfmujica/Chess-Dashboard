// One-off schema setup against the project's Neon database.
// Usage: node --env-file=.env.local scripts/init-db.mjs
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/init-db.mjs');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');

const statements = schema
  .split(';')
  .map(s => s.trim())
  .filter(Boolean);

for (const statement of statements) {
  console.log(`Running: ${statement.split('\n')[0]}...`);
  await sql.query(statement);
}

console.log(`Applied ${statements.length} statements.`);
