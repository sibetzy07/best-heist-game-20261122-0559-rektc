// main.ts — the entry program for Vaultbreak (best-heist-game-20261122-0559).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the kit's
// vendor/makefun-game.ts. Runs twice with identical bytes: the copies are
// byte-for-byte and the dossier is canonical JSON built from those bytes.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The gate's caps, from this competition's RULES.txt.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

const gameDir = join(REPO_ROOT, 'game');
const shotsDir = join(REPO_ROOT, 'screenshots');
if (!existsSync(gameDir)) fail('game/ is missing from the repository');
if (!existsSync(shotsDir)) fail('screenshots/ is missing from the repository');

mkdirSync(OUTPUT_DIR, { recursive: true });
rmSync(join(OUTPUT_DIR, 'game'), { recursive: true, force: true });
rmSync(join(OUTPUT_DIR, 'screenshots'), { recursive: true, force: true });
rmSync(join(OUTPUT_DIR, 'dossier.json'), { force: true });

cpSync(gameDir, join(OUTPUT_DIR, 'game'), { recursive: true });
cpSync(shotsDir, join(OUTPUT_DIR, 'screenshots'), { recursive: true });

const dossier = buildDossier(REPO_ROOT, CAPS);
if (dossier.length > 1.5 * 1024 * 1024) fail(`dossier.json is ${dossier.length} bytes, over the 1.5 MiB cap`);
writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);

// Sanity: the dossier we just wrote is the one buildDossier returns.
const written = readFileSync(join(OUTPUT_DIR, 'dossier.json'));
if (!written.equals(Buffer.from(dossier))) fail('dossier.json on disk differs from the built dossier');
console.log(`main.ts: wrote ${OUTPUT_DIR} (dossier.json ${dossier.length} bytes)`);
