#!/usr/bin/env node
/**
 * NSES Markdown import validator.
 *
 * Validates Claude Code-style `@path` imports in NSES Markdown files: missing
 * files, directories, missing profiles, paths outside the repository, letter-case
 * mismatches, sensitive files, duplicates, circular imports and excessive depth.
 */
import path from 'node:path';
import { analyzeImports } from './lib/imports.js';
import { Report, emit } from './lib/report.js';
import { NSES_ROOT, UsageError, isMain, listMarkdownFiles, loadManifest, parseArgs, rel, runCli, statSafe } from './lib/files.js';

export const USAGE = `Usage: node scripts/validate-imports.js [options]

Targets (default: every Markdown file in the repository):
  --profile <name>     Validate one technology profile and everything it imports (e.g. nextjs)
  --all-profiles       Validate every profile listed in standards.manifest.json
  --file <path>        Validate one Markdown file and everything it imports

Options:
  --root <dir>         Repository root (default: the NSES checkout containing this script)
  --json               Print machine-readable JSON
  --verbose            Also list passed checks
  --help               Show this help

Exit codes: 0 = no failures, 1 = validation failures, 2 = usage error, 3 = unexpected error.`;

/** Resolve CLI targets to entry files. Unknown profiles become FAIL results, not exceptions. */
function resolveTargets(flags, root, manifest, report) {
  const targetCount = ['profile', 'all-profiles', 'file'].filter((k) => flags[k]).length;
  if (targetCount > 1) throw new UsageError('Use only one of --profile, --all-profiles or --file.');

  const profileEntry = (name) => {
    const configured = manifest.profiles?.[name];
    const file = path.join(root, configured?.file ?? `profiles/${name}.md`);
    if (!statSafe(file)?.isFile()) {
      const supported = Object.keys(manifest.profiles ?? {}).join(', ');
      report.fail('IMPORT_MISSING_PROFILE', `Technology profile '${name}' was not found at ${rel(root, file)}. Supported profiles: ${supported}.`);
      return null;
    }
    if (!configured) report.warn('PROFILE_NOT_IN_MANIFEST', `Profile '${name}' exists but is not listed in standards.manifest.json.`, { file: rel(root, file) });
    return file;
  };

  if (flags.profile) return { label: `profile '${flags.profile}'`, entries: [profileEntry(flags.profile)].filter(Boolean) };
  if (flags['all-profiles']) {
    const names = Object.keys(manifest.profiles ?? {});
    return { label: `all profiles (${names.join(', ')})`, entries: names.map(profileEntry).filter(Boolean) };
  }
  if (flags.file) {
    const file = path.resolve(flags.file);
    const stat = statSafe(file);
    if (!stat) throw new UsageError(`File not found: ${flags.file}`);
    if (!stat.isFile()) throw new UsageError(`Not a file: ${flags.file}`);
    if (!/\.md$/i.test(file)) throw new UsageError(`Not a Markdown file: ${flags.file}`);
    return { label: `file ${rel(root, file)}`, entries: [file] };
  }
  return { label: 'entire repository', entries: listMarkdownFiles(root, manifest.ignore ?? []) };
}

export function validateImports({ root = NSES_ROOT, flags = {} } = {}) {
  const manifest = loadManifest(root);
  const report = new Report('');
  const { label, entries } = resolveTargets(flags, root, manifest, report);
  report.title = `NSES import validation — ${label}`;

  const { issues, graph } = analyzeImports({
    root,
    entries,
    templateFiles: manifest.templateFiles ?? {},
    maxDepth: manifest.maxImportDepth ?? 5,
  });
  report.addAll(issues);

  const filesWithIssues = new Set(issues.map((i) => i.file));
  let importCount = 0;
  for (const [file, edges] of graph) {
    importCount += edges.length;
    if (edges.length && !filesWithIssues.has(file)) report.pass('IMPORTS_OK', `${edges.length} import(s) resolved.`, { file });
  }
  report.info('IMPORT_SUMMARY', `Scanned ${graph.size} Markdown file(s) containing ${importCount} import(s).`);
  return report;
}

export function main(argv) {
  const { flags } = parseArgs(argv, { booleans: ['all-profiles', 'json', 'verbose', 'help'], strings: ['profile', 'file', 'root'] });
  if (flags.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const root = flags.root ? path.resolve(flags.root) : NSES_ROOT;
  const report = validateImports({ root, flags });
  return emit(report, { json: flags.json, verbose: flags.verbose });
}

if (isMain(import.meta.url)) runCli(main, USAGE);
