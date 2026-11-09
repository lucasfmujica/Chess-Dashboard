// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs module without types
import { scanContent, scanDir, scanSrc, secretsFromEnv } from './secretScan.mjs';

// Dummy values built at runtime; they are never printed.
const DUMMY_SECRET = 'dummy-secret-'.concat('a1b2c3d4e5');
const HEX_32 = 'ab12'.repeat(8);
const ALNUM_32 = 'Zx9Qw3'.repeat(6);
const B64_40 = 'Ab_-'.repeat(10);

const dirs: string[] = [];
const tempBuild = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), 'secret-scan-'));
  dirs.push(dir);
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true });
    writeFileSync(join(dir, name), body);
  }
  return dir;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('scanContent', () => {
  it('returns null for clean content', () => {
    expect(scanContent('const a = 1; // hello', 'a.js', [])).toBeNull();
  });

  it('flags the exact env secret value', () => {
    expect(scanContent(`x="${DUMMY_SECRET}"`, 'a.js', [DUMMY_SECRET])).toBe('env-secret');
    expect(scanContent(`x="${DUMMY_SECRET}"`, 'a.js', [])).toBeNull();
  });

  it('flags the VITE_API_SECRET name', () => {
    expect(scanContent('import.meta.env.VITE_API_SECRET', 'a.js', [])).toBe('name');
  });

  it('flags quoted hex literals of 32+ in any quote style, not shorter ones', () => {
    expect(scanContent(`x="${HEX_32}"`, 'a.js', [])).toBe('high-entropy');
    expect(scanContent(`x='${HEX_32}'`, 'a.css', [])).toBe('high-entropy');
    expect(scanContent(`x=\`${HEX_32}\``, 'a.js', [])).toBe('high-entropy');
    expect(scanContent(`x="${HEX_32.slice(0, 31)}"`, 'a.js', [])).toBeNull();
  });

  it('flags quoted mixed alphanumeric literals of 32+ (letter and digit required)', () => {
    expect(scanContent(`x=\`${ALNUM_32}\``, 'a.js', [])).toBe('high-entropy');
    expect(scanContent(`x="${ALNUM_32}"`, 'a.js', [])).toBe('high-entropy');
    expect(scanContent(`x="${ALNUM_32.slice(0, 31)}"`, 'a.js', [])).toBeNull();
    expect(scanContent(`x=\`${'Zzzy'.repeat(10)}\``, 'a.js', [])).toBeNull();
  });

  it('no longer flags base64url literals', () => {
    expect(scanContent(`x=\`${B64_40}\``, 'a.js', [])).toBeNull();
  });

  it('does not flag bare runs (e.g. minified module ids after a dot)', () => {
    expect(scanContent(`a.${B64_40}(1)`, 'a.js', [])).toBeNull();
    expect(scanContent(`a.${HEX_32}`, 'a.js', [])).toBeNull();
    expect(scanContent(`var ${ALNUM_32}=1`, 'a.js', [])).toBeNull();
  });

  it('skips entropy rules for non-text assets', () => {
    expect(scanContent(`x="${HEX_32}"`, 'a.png', [])).toBeNull();
  });
});

describe('secretsFromEnv', () => {
  it('keeps only values of 8+ chars from VITE_API_SECRET and API_SECRET', () => {
    expect(secretsFromEnv({ VITE_API_SECRET: 'short', API_SECRET: DUMMY_SECRET })).toEqual([
      DUMMY_SECRET,
    ]);
    expect(secretsFromEnv({})).toEqual([]);
  });
});

describe('scanDir', () => {
  it('reports only paths, never the matched value', () => {
    const dir = tempBuild({
      'ok.js': 'console.log(1)',
      'assets/leak.js': `x="${DUMMY_SECRET}"`,
      'assets/hash.js': `x="${HEX_32}"`,
    });
    const { findings, fileCount } = scanDir(dir, [DUMMY_SECRET]);
    expect(fileCount).toBe(3);
    expect(findings.sort()).toEqual([
      'match found in assets/hash.js',
      'match found in assets/leak.js',
    ]);
    expect(findings.join('\n')).not.toContain(DUMMY_SECRET);
    expect(findings.join('\n')).not.toContain(HEX_32);
  });
});

describe('scanSrc', () => {
  it('flags the secret name and VITE_*SECRET|KEY|TOKEN env vars by path only', () => {
    const dir = tempBuild({
      'ok.ts': 'const a = import.meta.env.VITE_PUBLIC_URL;',
      'a/name.ts': 'const s = import.meta.env.VITE_API_SECRET;',
      'b/key.tsx': 'const k = import.meta.env.VITE_SERVICE_KEY;',
    });
    const { findings } = scanSrc(dir);
    expect(findings.sort()).toEqual(['match found in a/name.ts', 'match found in b/key.tsx']);
  });
});
