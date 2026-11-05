#!/usr/bin/env node
/**
 * NSES standards repository validator.
 *
 * Verifies the structure and internal consistency of the NSES repository itself:
 * required files, semantic version and version consistency, technology
 * profiles and their imports, required standards, AI instruction templates,
 * Markdown imports and documentation path references.
 *
 * The expected structure is declared in standards.manifest.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { analyzeImports } from './lib/imports.js';
import { scanMarkdown } from './lib/markdown.js';
import { Report, emit } from './lib/report.js';
import { SEMVER } from './lib/semver.js';
import { NSES_ROOT, caseMismatch, isMain, listMarkdownFiles, loadManifest, parseArgs, readText, rel, runCli, statSafe } from './lib/files.js';

export const USAGE = `Usage: node scripts/validate-standards.js [options]

Options:
  --root <dir>   Repository root (default: the NSES checkout containing this script)
  --json         Print machine-readable JSON
  --verbose      Also list passed checks
  --help         Show this help

Exit codes: 0 = no failures, 1 = mandatory validation failed, 2 = usage error, 3 = unexpected error.`;

const S = {
  structure: '1. Repository structure',
  version: '2. Version consistency',
  profiles: '3. Technology profiles',
  standards: '4. Required standards',
  ai: '5. AI instruction templates',
  imports: '6. Markdown imports',
  docs: '7. Documentation references',
};

const isFile = (abs) => statSafe(abs)?.isFile() ?? false;

function checkStructure(ctx) {
  const { root, manifest, report } = ctx;
  for (const file of manifest.requiredRootFiles ?? []) {
    if (isFile(path.join(root, file))) report.pass('STRUCTURE_FILE', `${file} exists.`, { section: S.structure, file });
    else report.fail('STRUCTURE_FILE_MISSING', `Required file ${file} is missing.`, { section: S.structure, file });
  }
}

function checkVersion(ctx) {
  const { root, manifest, report } = ctx;
  const section = S.version;
  const versionFile = path.join(root, 'VERSION');
  if (!isFile(versionFile)) return; // already reported in structure

  const version = readText(versionFile).trim();
  ctx.version = version;
  if (!SEMVER.test(version)) {
    report.fail('VERSION_INVALID', `VERSION contains '${version}', which is not a valid semantic version (MAJOR.MINOR.PATCH).`, { section, file: 'VERSION' });
    return;
  }
  report.pass('VERSION_VALID', `VERSION is a valid semantic version (${version}).`, { section, file: 'VERSION' });

  for (const doc of manifest.versionedDocuments ?? []) {
    const abs = path.join(root, doc);
    if (!isFile(abs)) continue;
    const m = readText(abs).match(/\*\*Version:\*\*\s*v?([^\s*]+)/);
    if (!m) report.warn('VERSION_NOT_STATED', `${doc} does not state a '**Version:**' line.`, { section, file: doc });
    else if (m[1] !== version) report.fail('VERSION_MISMATCH', `${doc} states version ${m[1]} but VERSION is ${version}.`, { section, file: doc });
    else report.pass('VERSION_MATCH', `${doc} states the current version.`, { section, file: doc });
  }

  const changelog = path.join(root, 'CHANGELOG.md');
  if (isFile(changelog)) {
    const escaped = version.replace(/[.+]/g, '\\$&');
    if (new RegExp(`^##\\s*\\[${escaped}\\]`, 'm').test(readText(changelog))) {
      report.pass('CHANGELOG_ENTRY', `CHANGELOG.md has an entry for ${version}.`, { section, file: 'CHANGELOG.md' });
    } else report.fail('CHANGELOG_ENTRY_MISSING', `CHANGELOG.md has no '## [${version}]' entry.`, { section, file: 'CHANGELOG.md' });
  }

  const pkgFile = path.join(root, 'package.json');
  if (isFile(pkgFile)) {
    const pkgVersion = JSON.parse(readText(pkgFile)).version;
    if (pkgVersion !== version) report.fail('VERSION_MISMATCH', `package.json version ${pkgVersion} does not match VERSION ${version}.`, { section, file: 'package.json' });
    else report.pass('VERSION_MATCH', 'package.json version matches VERSION.', { section, file: 'package.json' });
  }
}

function checkProfiles(ctx) {
  const { root, manifest, report, graph } = ctx;
  const section = S.profiles;
  const profiles = manifest.profiles ?? {};
  const profileFiles = new Set(Object.values(profiles).map((p) => p.file));
  const entryText = isFile(path.join(root, 'ENTRY.md')) ? readText(path.join(root, 'ENTRY.md')) : '';

  if (!Object.keys(profiles).length) report.fail('PROFILES_NOT_DECLARED', 'standards.manifest.json declares no technology profiles.', { section });

  const profilesDir = path.join(root, 'profiles');
  if (statSafe(profilesDir)?.isDirectory()) {
    for (const name of fs.readdirSync(profilesDir).filter((f) => f.endsWith('.md'))) {
      if (!profileFiles.has(`profiles/${name}`)) {
        report.warn('PROFILE_NOT_IN_MANIFEST', `profiles/${name} is not declared in standards.manifest.json, so it is not validated as a profile.`, { section, file: `profiles/${name}` });
      }
    }
  }

  const allFrameworkDirs = Object.values(profiles).flatMap((p) => p.frameworkDirs ?? []);

  for (const [name, profile] of Object.entries(profiles)) {
    const file = profile.file;
    if (!isFile(path.join(root, file))) {
      report.fail('PROFILE_MISSING', `Supported profile '${name}' is missing (${file}).`, { section, file });
      continue;
    }
    report.pass('PROFILE_EXISTS', `Profile '${name}' exists.`, { section, file });

    if (entryText.includes(file)) report.pass('PROFILE_IN_ENTRY', `ENTRY.md directs readers to ${file}.`, { section, file: 'ENTRY.md' });
    else report.fail('PROFILE_NOT_IN_ENTRY', `ENTRY.md does not reference ${file}; users cannot discover the '${name}' profile.`, { section, file: 'ENTRY.md' });

    const edges = graph.get(file) ?? [];
    const direct = new Map(edges.filter((e) => e.ok).map((e) => [e.resolved, e]));
    if (!edges.length) report.fail('PROFILE_NO_IMPORTS', `Profile '${name}' imports no standards.`, { section, file });

    const required = [...new Set([...(manifest.profileBaseline ?? []), ...(profile.requiredImports ?? [])])];
    const missing = required.filter((r) => !direct.has(r));
    if (missing.length) report.fail('PROFILE_REQUIRED_IMPORT_MISSING', `Profile '${name}' does not import required standard(s): ${missing.join(', ')}.`, { section, file });
    else report.pass('PROFILE_REQUIRED_IMPORTS', `Profile '${name}' imports all ${required.length} required standards.`, { section, file });

    const allowed = new Map((profile.allowedCrossFrameworkImports ?? []).map((a) => [a.path, a.reason]));
    for (const [p, reason] of allowed) {
      if (!reason?.trim()) report.fail('MANIFEST_MISSING_REASON', `Allowed cross-framework import ${p} for '${name}' has no documented reason.`, { section, file: 'standards.manifest.json' });
      if (!direct.has(p)) report.warn('MANIFEST_STALE_EXCEPTION', `standards.manifest.json allows '${name}' to import ${p}, but the profile does not import it.`, { section, file: 'standards.manifest.json' });
    }

    const ownDirs = profile.frameworkDirs ?? [];
    for (const [target, edge] of direct) {
      if (profileFiles.has(target)) {
        report.fail('PROFILE_IMPORTS_PROFILE', `Profile '${name}' imports another profile (${target}). Import the detailed standards instead so profiles stay independent.`, { section, file, line: edge.line });
        continue;
      }
      const foreignDir = allFrameworkDirs.find((d) => target.startsWith(`${d}/`) && !ownDirs.includes(d));
      if (!foreignDir) continue;
      if (allowed.get(target)?.trim()) {
        report.info('PROFILE_CROSS_FRAMEWORK_ALLOWED', `Profile '${name}' imports ${target}: ${allowed.get(target)}`, { section, file, line: edge.line });
      } else {
        report.fail('PROFILE_CONFLICTING_IMPORT', `Profile '${name}' imports ${target} from another framework without an explanation. Remove it or add it to allowedCrossFrameworkImports with a reason in standards.manifest.json.`, { section, file, line: edge.line });
      }
    }
  }
}

function checkRequiredStandards(ctx) {
  const { root, manifest, report } = ctx;
  for (const [category, files] of Object.entries(manifest.requiredStandards ?? {})) {
    const section = category === 'aiInstructions' ? S.ai : S.standards;
    for (const file of files) {
      const abs = path.join(root, file);
      if (!isFile(abs)) {
        report.fail('STANDARD_MISSING', `Required ${category} document ${file} is missing.`, { section, file });
        continue;
      }
      const text = readText(abs);
      // GitHub templates are pasted into PR bodies and intentionally have no document title.
      if (category !== 'templates' && !/^#\s+\S/m.test(text)) report.warn('STANDARD_NO_TITLE', `${file} has no top-level '# ' heading.`, { section, file });
      else report.pass('STANDARD_EXISTS', `${file} exists.`, { section, file });
    }
  }
}

function checkAiTemplates(ctx) {
  const { root, manifest, report } = ctx;
  const section = S.ai;
  const mount = manifest.consumerMountPath ?? '.engineering/standards';
  const entry = `${mount}/ENTRY.md`;
  const profilePaths = Object.values(manifest.profiles ?? {}).map((p) => `${mount}/${p.file}`);

  const claude = path.join(root, 'ai-instructions/CLAUDE.md');
  if (isFile(claude)) {
    const imports = scanMarkdown(readText(claude)).imports.map((i) => i.target);
    if (imports.includes(entry)) report.pass('TEMPLATE_CLAUDE_ENTRY', `CLAUDE.md template imports @${entry}.`, { section, file: 'ai-instructions/CLAUDE.md' });
    else report.fail('TEMPLATE_CLAUDE_ENTRY_MISSING', `CLAUDE.md template must import @${entry}.`, { section, file: 'ai-instructions/CLAUDE.md' });
    if (!imports.some((i) => profilePaths.includes(i))) report.fail('TEMPLATE_CLAUDE_PROFILE_MISSING', 'CLAUDE.md template does not import an example technology profile.', { section, file: 'ai-instructions/CLAUDE.md' });
  }

  const agents = path.join(root, 'ai-instructions/AGENTS.md');
  if (isFile(agents)) {
    const text = readText(agents);
    if (text.includes(entry)) report.pass('TEMPLATE_AGENTS_ENTRY', `AGENTS.md template references ${entry}.`, { section, file: 'ai-instructions/AGENTS.md' });
    else report.fail('TEMPLATE_AGENTS_ENTRY_MISSING', `AGENTS.md template must reference ${entry}.`, { section, file: 'ai-instructions/AGENTS.md' });
    const missing = profilePaths.filter((p) => !text.includes(p));
    if (missing.length) report.warn('TEMPLATE_AGENTS_PROFILE_MISSING', `AGENTS.md template does not list profile(s): ${missing.join(', ')}.`, { section, file: 'ai-instructions/AGENTS.md' });
    else report.pass('TEMPLATE_AGENTS_PROFILES', 'AGENTS.md template lists every supported profile.', { section, file: 'ai-instructions/AGENTS.md' });
  }
}

function checkDocReferences(ctx) {
  const { root, manifest, report, markdownFiles } = ctx;
  const section = S.docs;
  const mount = manifest.consumerMountPath ?? '.engineering/standards';
  const projectLevel = new Set(manifest.projectLevelFileNames ?? []);
  // Historical documents (e.g. CHANGELOG.md) legitimately mention files that were later renamed or removed.
  const excluded = new Set(manifest.docReferenceExclusions ?? []);
  let checked = 0;

  for (const abs of markdownFiles) {
    const file = rel(root, abs);
    if (excluded.has(file)) continue;
    for (const ref of scanMarkdown(readText(abs)).references) {
      const target = ref.target.startsWith(`${mount}/`) ? ref.target.slice(mount.length + 1) : ref.target;
      const candidates = ref.target.startsWith(`${mount}/`)
        ? [path.join(root, target)]
        : [path.resolve(path.dirname(abs), target), path.resolve(root, target)];
      const found = candidates.find((c) => statSafe(c));
      checked += 1;
      if (found) {
        const actual = caseMismatch(root, found);
        if (actual) report.fail('DOC_REFERENCE_CASE_MISMATCH', `'${ref.target}' differs in letter case from ${actual}.`, { section, file, line: ref.line });
        continue;
      }
      if (projectLevel.has(target)) continue; // refers to a file in the consuming project, e.g. AGENTS.md
      if (ref.kind === 'link' || target.includes('/')) {
        report.fail('DOC_REFERENCE_NOT_FOUND', `Reference '${ref.target}' does not resolve to a file in the repository.`, { section, file, line: ref.line });
      } else {
        report.warn('DOC_REFERENCE_UNRESOLVED', `'${ref.target}' does not match a repository file. If it refers to a consuming-project file, add it to projectLevelFileNames in standards.manifest.json.`, { section, file, line: ref.line });
      }
    }
  }
  report.info('DOC_REFERENCES_CHECKED', `Checked ${checked} documentation path reference(s) in ${markdownFiles.length} file(s).`, { section });
}

export function validateStandards({ root = NSES_ROOT } = {}) {
  const report = new Report('NSES standards repository validation');
  let manifest;
  try {
    manifest = loadManifest(root);
  } catch (err) {
    report.fail('MANIFEST_INVALID', `standards.manifest.json is missing or invalid: ${err.message}`, { section: S.structure });
    return report;
  }

  const markdownFiles = listMarkdownFiles(root, manifest.ignore ?? []);
  const { issues, graph } = analyzeImports({
    root,
    entries: markdownFiles,
    templateFiles: manifest.templateFiles ?? {},
    maxDepth: manifest.maxImportDepth ?? 5,
  });

  const ctx = { root, manifest, report, graph, markdownFiles };
  checkStructure(ctx);
  checkVersion(ctx);
  checkProfiles(ctx);
  checkRequiredStandards(ctx);
  checkAiTemplates(ctx);

  report.addAll(issues, { section: S.imports });
  if (!issues.some((i) => i.level === 'FAIL')) report.pass('IMPORTS_VALID', `All imports in ${markdownFiles.length} Markdown file(s) resolve.`, { section: S.imports });

  checkDocReferences(ctx);
  return report;
}

export function main(argv) {
  const { flags } = parseArgs(argv, { booleans: ['json', 'verbose', 'help'], strings: ['root'] });
  if (flags.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const report = validateStandards({ root: flags.root ? path.resolve(flags.root) : NSES_ROOT });
  return emit(report, { json: flags.json, verbose: flags.verbose });
}

if (isMain(import.meta.url)) runCli(main, USAGE);
