// One-off importer for the closed rapid-games recovery manifest.
//
// Thin wrapper: everything it does lives in scripts/lib/recoverGames.ts, which
// is what the tests exercise. Nothing here is a Vercel function and nothing is
// wired to the cron.
//
// The manifest is private and stays outside this repository. The run is pinned
// to it by SHA-256: if the bytes do not hash to --expect-sha256, nothing is
// parsed, fetched or written.
//
// By default it only reports. Writing needs an explicitly confirmed
// destination (local, the Neon preview branch, or prod pinned to this one
// manifest's hash), and the connection string is read from RECOVERY_DATABASE_URL
// alone — an ambient DATABASE_URL stops the run.
//
// Usage:
//   # report only, no database
//   npx tsx scripts/recover-games-from-manifest.mts \
//     --manifest <private path> --expect-sha256 <hex>
//
//   # report only, checking which ids a local rehearsal database already has
//   npx tsx scripts/recover-games-from-manifest.mts \
//     --manifest <private path> --expect-sha256 <hex> \
//     --target local --confirm-target local --pglite-dir ./.rehearsal-db
//
//   # local rehearsal that writes
//   ... --target local --confirm-target local --pglite-dir ./.rehearsal-db --write
//
//   # Neon preview (needs Lucas's OK, a preview-only URL and the extra flag)
//   RECOVERY_DATABASE_URL=... RECOVERY_ALLOW_PREVIEW_WRITE=1 \
//     npx tsx scripts/recover-games-from-manifest.mts \
//     --manifest <private path> --expect-sha256 <hex> \
//     --target preview --confirm-target br-wispy-meadow-af1r6nk7 --write \
//     --out <private path>.json
//
//   # prod: only this manifest's pinned hash, only its pinned branch/endpoint.
//   # Dry run (SELECTs only; needs no write flags):
//   RECOVERY_DATABASE_URL=... \
//     npx tsx scripts/recover-games-from-manifest.mts \
//     --manifest <private path> --expect-sha256 <the pinned hash> \
//     --target prod --confirm-target br-royal-pond-afkmp27d
//   # Write: add RECOVERY_ALLOW_PROD_WRITE=1, --write, --out <new private path>
//   # and --confirm-backup-branch <br-... of an existing Neon backup branch>.
//   # The script does not create the backup; it only demands that one be named.
//
// Flags: --manifest, --expect-sha256, --write, --target preview|local|prod,
// --confirm-target, --confirm-backup-branch, --pglite-dir, --out.
import { runCli } from './lib/recoverGames.js';

process.exitCode = await runCli(process.argv.slice(2));
