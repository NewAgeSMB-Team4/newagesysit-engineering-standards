/** File-system helpers shared by NSES tools. All functions are read-only. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the NSES repository that contains these scripts. */
export const NSES_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** Path of `abs` relative to `root`, using forward slashes. */
export function rel(root, abs) {
  return toPosix(path.relative(root, abs)) || '.';
}

export function isInside(root, abs) {
  const r = path.relative(root, abs);
  return r === '' || (!r.startsWith('..') && !path.isAbsolute(r));
}

export function statSafe(abs) {
  try {
    return fs.statSync(abs);
  } catch {
    return null;
  }
}

export function readText(abs) {
  return fs.readFileSync(abs, 'utf8');
}

export function loadManifest(root = NSES_ROOT) {
  const file = path.join(root, 'standards.manifest.json');
  return JSON.parse(readText(file));
}

/**
 * Return the on-disk spelling of `abs` relative to `root` if any segment differs
 * in case, or null if the case matches. Detects references that work on
 * case-insensitive file systems (Windows/macOS) but break on Linux CI.
 */
export function caseMismatch(root, abs) {
  const segments = path.relative(root, abs).split(path.sep).filter(Boolean);
  let current = root;
  const actual = [];
  for (const segment of segments) {
    if (segment === '..') return null;
    let entries;
    try {
      entries = fs.readdirSync(current);
    } catch {
      return null;
    }
    if (entries.includes(segment)) {
      actual.push(segment);
    } else {
      const match = entries.find((e) => e.toLowerCase() === segment.toLowerCase());
      if (!match) return null;
      actual.push(match);
    }
    current = path.join(current, actual.at(-1));
  }
  const actualRel = actual.join('/');
  return actualRel === segments.join('/') ? null : actualRel;
}

/**
 * Recursively list Markdown files under `root`, skipping ignored paths
 * (relative POSIX prefixes such as `node_modules` or `test/fixtures`).
 */
export function listMarkdownFiles(root, ignore = []) {
  const out = [];
  const ignored = (relPath) => ignore.some((i) => relPath === i || relPath.startsWith(`${i}/`));
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const r = rel(root, abs);
      if (ignored(r)) continue;
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile() && /\.md$/i.test(entry.name)) out.push(abs);
    }
  };
  walk(root);
  return out.sort((a, b) => a.localeCompare(b));
}

/** Very small argv parser: supports `--flag`, `--key value`, `--key=value` and positionals. */
export function parseArgs(argv, { booleans = [], strings = [] } = {}) {
  const flags = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split(/=(.*)/s);
    if (booleans.includes(key)) flags[key] = true;
    else if (strings.includes(key)) {
      const value = inline ?? argv[i + 1];
      if (value === undefined || (inline === undefined && value.startsWith('--'))) throw new UsageError(`--${key} requires a value`);
      if (inline === undefined) i += 1;
      flags[key] = value;
    } else throw new UsageError(`Unknown option --${key}`);
  }
  return { flags, positionals };
}

export class UsageError extends Error {}

/** True when the module at `metaUrl` is the script Node was started with. */
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(fileURLToPath(metaUrl)) === fs.realpathSync(path.resolve(process.argv[1]));
  } catch {
    return false;
  }
}

/** Standard CLI wrapper: maps UsageError to exit code 2 and unexpected errors to 3. */
export function runCli(main, usage) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    if (err instanceof UsageError) {
      process.stderr.write(`Error: ${err.message}\n\n${usage}\n`);
      process.exitCode = 2;
    } else {
      process.stderr.write(`Unexpected error: ${err.stack ?? err}\n`);
      process.exitCode = 3;
    }
  }
}
