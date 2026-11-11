#!/usr/bin/env node
/**
 * NSES project integration checker.
 *
 * Inspects a consuming project's NSES *configuration*: submodule, pinned
 * version, detected technology stack, CLAUDE.md / AGENTS.md integration,
 * referenced profiles and recommended quality tooling.
 *
 * Safety guarantees (covered by tests):
 * - Read-only: never writes to, installs into or executes anything in the target project.
 * - Reads only an allowlisted set of configuration and agent-instruction files;
 *   never opens .env files, keys or credential files, and never prints file contents.
 * - Makes no network requests.
 *
 * This is NOT a security scanner or code-quality audit. A passing result means
 * NSES is wired in as configured, not that the project is secure or compliant.
 */
import fs from 'node:fs';
import path from 'node:path';
import { analyzeImports, isSensitivePath } from './lib/imports.js';
import { scanMarkdown } from './lib/markdown.js';
import { Report, emit } from './lib/report.js';
import { NSES_ROOT, UsageError, isInside, isMain, loadManifest, parseArgs, rel, runCli, statSafe } from './lib/files.js';
import { SEMVER, compareSemver } from './lib/semver.js';

export const USAGE = `Usage: node scripts/check-project-compliance.js [project-path] [options]

Checks how a project integrates NSES. Defaults to the current directory.

Options:
  --standards-path <p>  Location of the NSES checkout inside the project (default: auto-detect,
                        then ${'.engineering/standards'})
  --report              Report-only: always exit 0 (recommended for initial CI adoption)
  --json                Print machine-readable JSON
  --verbose             Also list passed checks
  --help                Show this help

Exit codes: 0 = no failures (or --report), 1 = failures, 2 = usage error, 3 = unexpected error.`;

export const DISCLAIMER = [
  'SCOPE: This is a configuration check. It verifies that NSES is installed and referenced, and that',
  'recommended tooling is configured. It does NOT inspect source code, run tests or linters, detect',
  'vulnerabilities, verify authorization logic or prove compliance. Use the project\'s CI checks, SAST /',
  'dependency scanning and human security review for those. A PASS here is not a security sign-off.',
].join('\n');

const MAX_READ_BYTES = 1024 * 1024;
const S = {
  stack: '1. Project and technology stack',
  nses: '2. NSES installation and version',
  claude: '3. CLAUDE.md integration',
  agents: '4. AGENTS.md integration',
  profiles: '5. Technology profile coverage',
  tooling: '6. Recommended quality tooling (configuration presence only)',
  hygiene: '7. Repository hygiene',
};

/** Read a project file only if it is a regular, non-sensitive, reasonably small file inside the project. */
function makeReader(projectRoot) {
  return (relPath) => {
    const abs = path.resolve(projectRoot, relPath);
    if (!isInside(projectRoot, abs) || isSensitivePath(abs)) return null;
    const stat = statSafe(abs);
    if (!stat?.isFile() || stat.size > MAX_READ_BYTES) return null;
    try {
      return fs.readFileSync(abs, 'utf8');
    } catch {
      return null;
    }
  };
}

const exists = (root, p) => Boolean(statSafe(path.join(root, p)));

/** Remove credentials from a URL before printing it. */
export function redactUrl(url) {
  return url.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/]+@/i, '$1').replace(/[?#].*$/, '');
}

export function parseGitmodules(text) {
  const modules = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const header = line.match(/^\s*\[submodule\s+"([^"]+)"\]\s*$/);
    if (header) {
      current = { name: header[1] };
      modules.push(current);
      continue;
    }
    const kv = line.match(/^\s*(path|url|branch)\s*=\s*(.+?)\s*$/);
    if (kv && current) current[kv[1]] = kv[2];
  }
  return modules;
}

/** Strip // and /* *\/ comments so tsconfig (JSONC) can be pattern-matched reliably. */
function stripJsonComments(text) {
  return text.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => str ?? '');
}

/**
 * Inspect the submodule's git metadata (read-only) to find what it is pinned to.
 * Returns { kind: 'tag'|'branch'|'commit'|'unknown', value }.
 */
export function readSubmodulePin(nsesAbs) {
  try {
    const dotGit = path.join(nsesAbs, '.git');
    const stat = statSafe(dotGit);
    if (!stat) return { kind: 'unknown' };
    let gitDir = dotGit;
    if (stat.isFile()) {
      const m = fs.readFileSync(dotGit, 'utf8').match(/^gitdir:\s*(.+)\s*$/m);
      if (!m) return { kind: 'unknown' };
      gitDir = path.resolve(nsesAbs, m[1]);
    }
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    if (head.startsWith('ref:')) return { kind: 'branch', value: head.replace(/^ref:\s*refs\/heads\//, '') };

    const tags = [];
    const packed = path.join(gitDir, 'packed-refs');
    if (statSafe(packed)) {
      let last = null;
      for (const line of fs.readFileSync(packed, 'utf8').split(/\r?\n/)) {
        const ref = line.match(/^([0-9a-f]{40})\s+refs\/tags\/(.+)$/);
        if (ref) {
          last = ref[2];
          if (ref[1] === head) tags.push(last);
        } else if (line.startsWith('^') && line.slice(1) === head && last) tags.push(last);
      }
    }
    const tagDir = path.join(gitDir, 'refs', 'tags');
    if (statSafe(tagDir)?.isDirectory()) {
      for (const name of fs.readdirSync(tagDir)) {
        const sha = fs.readFileSync(path.join(tagDir, name), 'utf8').trim();
        if (sha === head) tags.push(name);
      }
    }
    return tags.length ? { kind: 'tag', value: [...new Set(tags)].join(', ') } : { kind: 'commit', value: head.slice(0, 12) };
  } catch {
    return { kind: 'unknown' };
  }
}

function detectStack(ctx) {
  const { report, read, manifest, projectRoot } = ctx;
  const section = S.stack;
  const raw = read('package.json');
  ctx.pkg = null;
  ctx.stacks = [];
  if (raw === null) {
    report.warn('STACK_NO_PACKAGE_JSON', 'No package.json found; the technology stack cannot be detected. NSES currently supports Node.js projects.', { section });
    return;
  }
  try {
    ctx.pkg = JSON.parse(raw);
  } catch {
    report.fail('STACK_PACKAGE_JSON_INVALID', 'package.json is not valid JSON.', { section, file: 'package.json' });
    return;
  }
  const depsOf = (pkg) => ({ ...pkg?.peerDependencies, ...pkg?.devDependencies, ...pkg?.dependencies });
  const deps = depsOf(ctx.pkg);
  ctx.deps = deps;

  // Evaluate each package on its own, so a Next.js app's `react` dependency is not reported as React.
  const packages = [{ dir: null, deps }];
  const workspaceDirs = findWorkspaceDirs(ctx);
  for (const dir of workspaceDirs) {
    try {
      const wsRaw = read(`${dir}/package.json`);
      if (wsRaw !== null) packages.push({ dir, deps: depsOf(JSON.parse(wsRaw)) });
    } catch {
      report.warn('STACK_WORKSPACE_PACKAGE_INVALID', `${dir}/package.json is not valid JSON; it was skipped.`, { section, file: `${dir}/package.json` });
    }
  }

  for (const [name, profile] of Object.entries(manifest.profiles ?? {})) {
    for (const { dir, deps: pkgDeps } of packages) {
      const hit = (profile.detect?.dependencies ?? []).find((d) => d in pkgDeps);
      const excluded = (profile.detect?.excludeIfDependencies ?? []).some((d) => d in pkgDeps);
      if (!hit || excluded) continue;
      if (!ctx.stacks.includes(name)) ctx.stacks.push(name);
      const where = dir ? ` in ${dir}` : '';
      report.info('STACK_DETECTED', `Detected ${profile.displayName} (${hit} ${pkgDeps[hit]})${where}.`, { section, file: dir ? `${dir}/package.json` : 'package.json' });
    }
  }
  ctx.typescript = packages.some((p) => 'typescript' in p.deps) || exists(projectRoot, 'tsconfig.json');
  if (ctx.typescript) report.info('STACK_TYPESCRIPT', `TypeScript detected${deps.typescript ? ` (typescript ${deps.typescript})` : ''}.`, { section });
  if (workspaceDirs.length) report.info('STACK_WORKSPACES', `Monorepo: checked ${workspaceDirs.length} workspace package(s) for the technology stack.`, { section });
  if (!ctx.stacks.length) report.warn('STACK_UNKNOWN', 'No supported framework (Next.js, NestJS, React) detected in package.json dependencies.', { section, file: 'package.json' });
  if (ctx.stacks.length > 1) report.info('STACK_MULTIPLE', `Multiple technologies detected (${ctx.stacks.join(', ')}). Reference each applicable profile.`, { section });
}

/**
 * Workspace package directories declared by package.json `workspaces` (npm, Yarn) or pnpm-workspace.yaml.
 * shortcut: supports literal paths and a trailing `/*` or `/**` (one level of subfolders), which covers
 * the usual apps/* and packages/* layouts; upgrade to full glob matching if deeper patterns appear.
 */
export function findWorkspaceDirs(ctx) {
  const { read, projectRoot, pkg } = ctx;
  const patterns = Array.isArray(pkg?.workspaces) ? [...pkg.workspaces] : [...(pkg?.workspaces?.packages ?? [])];
  patterns.push(...pnpmWorkspacePatterns(read('pnpm-workspace.yaml') ?? ''));

  const dirs = new Set();
  for (const raw of patterns) {
    if (typeof raw !== 'string' || raw.startsWith('!')) continue;
    for (const dir of expandWorkspacePattern(projectRoot, raw.replace(/^\.\//, '').replace(/\/$/, ''))) {
      if (dir && dir !== '.' && isInside(projectRoot, path.resolve(projectRoot, dir))) dirs.add(dir);
    }
  }
  return [...dirs].sort((a, b) => a.localeCompare(b));
}

/** The list items under the top-level `packages:` key of pnpm-workspace.yaml. */
export function pnpmWorkspacePatterns(yaml) {
  const out = [];
  let inPackages = false;
  for (const line of yaml.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      inPackages = line.startsWith('packages:');
      continue;
    }
    const item = line.trim();
    if (!inPackages || !item.startsWith('-')) continue;
    const value = item.slice(1).split('#')[0].trim().replace(/^['"]/, '').replace(/['"]$/, '');
    if (value) out.push(value);
  }
  return out;
}

function expandWorkspacePattern(projectRoot, pattern) {
  if (!pattern.includes('*')) return [pattern];
  if (!pattern.endsWith('/*') && !pattern.endsWith('/**')) return [];
  const base = pattern.slice(0, pattern.lastIndexOf('/'));
  if (base.includes('*')) return [];
  const parent = path.resolve(projectRoot, base);
  if (!isInside(projectRoot, parent) || !statSafe(parent)?.isDirectory()) return [];
  return fs.readdirSync(parent, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.'))
    .map((e) => `${base}/${e.name}`);
}

function checkNses(ctx) {
  const { report, read, manifest, projectRoot, flags } = ctx;
  const section = S.nses;
  const defaultMount = manifest.consumerMountPath ?? '.engineering/standards';
  const modules = parseGitmodules(read('.gitmodules') ?? '');
  const pattern = manifest.repositoryUrlPattern ?? 'newagesysit-engineering-standards';
  const submodule = flags['standards-path']
    ? modules.find((m) => m.path === flags['standards-path'])
    : modules.find((m) => m.url?.includes(pattern)) ?? modules.find((m) => m.path === defaultMount);

  const mount = flags['standards-path'] ?? submodule?.path ?? defaultMount;
  ctx.mount = mount.replace(/\\/g, '/').replace(/\/$/, '');
  const nsesAbs = path.resolve(projectRoot, ctx.mount);
  ctx.nsesAbs = nsesAbs;

  if (!isInside(projectRoot, nsesAbs)) {
    throw new UsageError(`--standards-path must be inside the project: ${mount}`);
  }

  if (submodule) {
    report.pass('NSES_SUBMODULE', `NSES is registered as a Git submodule at ${submodule.path}${submodule.url ? ` (${redactUrl(submodule.url)})` : ''}.`, { section, file: '.gitmodules' });
    if (submodule.branch) report.warn('NSES_SUBMODULE_BRANCH', `The submodule is configured to track branch '${submodule.branch}'. Pin a release tag instead of following a branch.`, { section, file: '.gitmodules' });
  }

  const dirStat = statSafe(nsesAbs);
  if (!dirStat?.isDirectory()) {
    if (submodule) report.fail('NSES_NOT_INITIALIZED', `Submodule directory ${ctx.mount} is missing. Run: git submodule update --init`, { section });
    else report.fail('NSES_NOT_FOUND', `NSES was not found (no .gitmodules entry matching '${pattern}' and no ${ctx.mount} directory). Add it as a Git submodule pinned to a release tag.`, { section });
    ctx.nsesAvailable = false;
    return;
  }
  if (!statSafe(path.join(nsesAbs, 'ENTRY.md'))) {
    report.fail('NSES_NOT_INITIALIZED', `${ctx.mount} exists but does not contain ENTRY.md. Run: git submodule update --init${submodule ? '' : ' (or check the path)'}`, { section });
    ctx.nsesAvailable = false;
    return;
  }
  ctx.nsesAvailable = true;
  if (!submodule) report.warn('NSES_NOT_SUBMODULE', `${ctx.mount} exists but is not registered in .gitmodules. A copied (vendored) checkout cannot be pinned or upgraded reliably.`, { section });

  const versionText = statSafe(path.join(nsesAbs, 'VERSION')) ? fs.readFileSync(path.join(nsesAbs, 'VERSION'), 'utf8').trim() : null;
  if (!versionText) report.fail('NSES_VERSION_MISSING', `${ctx.mount}/VERSION is missing.`, { section });
  else if (!SEMVER.test(versionText)) report.fail('NSES_VERSION_INVALID', `${ctx.mount}/VERSION ('${versionText}') is not a semantic version.`, { section });
  else {
    ctx.nsesVersion = versionText;
    report.pass('NSES_VERSION', `NSES version ${versionText}.`, { section, file: `${ctx.mount}/VERSION` });
    if (compareSemver(versionText, '1.1.0') < 0) report.warn('NSES_VERSION_OLD', `NSES ${versionText} predates technology profiles (1.1.0). Upgrade to use ENTRY.md and profiles/.`, { section });
    const checkerVersion = statSafe(path.join(NSES_ROOT, 'VERSION')) ? fs.readFileSync(path.join(NSES_ROOT, 'VERSION'), 'utf8').trim() : null;
    if (checkerVersion && path.resolve(NSES_ROOT) !== path.resolve(nsesAbs) && checkerVersion !== versionText) {
      report.info('NSES_VERSION_DIFFERS', `This checker is from NSES ${checkerVersion}; the project pins ${versionText}.`, { section });
    }
  }

  const pin = readSubmodulePin(nsesAbs);
  if (pin.kind === 'tag') report.pass('NSES_PINNED_TAG', `Submodule checkout is pinned to tag ${pin.value}.`, { section });
  else if (pin.kind === 'branch') report.warn('NSES_TRACKS_BRANCH', `Submodule checkout is on branch '${pin.value}'. Check out an approved release tag.`, { section });
  else if (pin.kind === 'commit') report.info('NSES_PINNED_COMMIT', `Submodule checkout is at commit ${pin.value}, which does not match a local tag. Confirm it is an approved release (git submodule status).`, { section });
  else report.info('NSES_PIN_UNKNOWN', 'Could not determine the submodule pin from local git metadata. Verify with: git submodule status', { section });
}

/** Return root-relative profile names referenced by a set of NSES-relative paths. */
function profileNamesFrom(paths, ctx) {
  const byFile = new Map(Object.entries(ctx.manifest.profiles ?? {}).map(([n, p]) => [`${ctx.mount}/${p.file}`, n]));
  const names = new Set();
  for (const p of paths) {
    if (byFile.has(p)) names.add(byFile.get(p));
    else {
      const m = p.match(new RegExp(`^${ctx.mount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/profiles/([^/]+)\\.md$`));
      if (m) names.add(m[1]);
    }
  }
  return names;
}

function checkClaude(ctx) {
  const { report, read, projectRoot, manifest } = ctx;
  const section = S.claude;
  const text = read('CLAUDE.md');
  ctx.claudeProfiles = new Set();
  if (text === null) {
    report.add(ctx.hasAgents ? 'WARNING' : 'FAIL', 'CLAUDE_MD_MISSING', 'No project-root CLAUDE.md. Copy ai-instructions/CLAUDE.md from NSES and select the applicable profile.', { section });
    return;
  }
  report.pass('CLAUDE_MD_EXISTS', 'Project-root CLAUDE.md exists.', { section, file: 'CLAUDE.md' });

  const claudeAbs = path.join(projectRoot, 'CLAUDE.md');
  const resolved = scanMarkdown(text).imports.map((i) => rel(projectRoot, path.resolve(projectRoot, i.target)));
  const entry = `${ctx.mount}/ENTRY.md`;
  if (resolved.includes(entry)) report.pass('CLAUDE_ENTRY_IMPORT', `CLAUDE.md imports @${entry}.`, { section, file: 'CLAUDE.md' });
  else report.fail('CLAUDE_ENTRY_IMPORT_MISSING', `CLAUDE.md does not import the NSES entry point. Add: @${entry}`, { section, file: 'CLAUDE.md' });

  ctx.claudeProfiles = profileNamesFrom(resolved, ctx);
  if (!ctx.claudeProfiles.size) report.fail('CLAUDE_PROFILE_IMPORT_MISSING', `CLAUDE.md does not import a technology profile (e.g. @${ctx.mount}/profiles/<profile>.md).`, { section, file: 'CLAUDE.md' });
  else report.pass('CLAUDE_PROFILE_IMPORT', `CLAUDE.md imports profile(s): ${[...ctx.claudeProfiles].join(', ')}.`, { section, file: 'CLAUDE.md' });
  if (ctx.claudeProfiles.size >= Object.keys(manifest.profiles ?? {}).length && ctx.claudeProfiles.size > 1) {
    report.warn('CLAUDE_ALL_PROFILES', 'CLAUDE.md imports every profile. Import only the profiles that match this project to keep agent context focused.', { section, file: 'CLAUDE.md' });
  }
  if (text.includes('If this template is copied into a project')) {
    report.warn('CLAUDE_TEMPLATE_NOT_CUSTOMIZED', 'CLAUDE.md still contains NSES template guidance text. Replace the example profile section with this project\'s actual profile and context.', { section, file: 'CLAUDE.md' });
  }

  // Follow every import transitively (into NSES) and report broken, unsafe or circular references.
  if (ctx.nsesAvailable !== false) {
    const { issues } = analyzeImports({ root: projectRoot, entries: [claudeAbs], maxDepth: manifest.maxImportDepth ?? 5 });
    report.addAll(issues, { section });
    if (!issues.some((i) => i.level === 'FAIL')) report.pass('CLAUDE_IMPORTS_RESOLVE', 'All CLAUDE.md imports (including nested NSES imports) resolve.', { section, file: 'CLAUDE.md' });
  }
}

function checkAgents(ctx) {
  const { report, read, projectRoot } = ctx;
  const section = S.agents;
  const text = read('AGENTS.md');
  ctx.agentsProfiles = new Set();
  if (text === null) {
    report.add(ctx.hasClaude ? 'WARNING' : 'FAIL', 'AGENTS_MD_MISSING', 'No project-root AGENTS.md. Copy ai-instructions/AGENTS.md from NSES so non-Claude agents also follow NSES.', { section });
    return;
  }
  report.pass('AGENTS_MD_EXISTS', 'Project-root AGENTS.md exists.', { section, file: 'AGENTS.md' });

  const escaped = ctx.mount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const refs = [...new Set([...text.matchAll(new RegExp(`${escaped}/[A-Za-z0-9_./-]+\\.md`, 'g'))].map((m) => m[0]))];
  const entry = `${ctx.mount}/ENTRY.md`;
  if (refs.includes(entry)) report.pass('AGENTS_ENTRY_REFERENCE', `AGENTS.md references ${entry}.`, { section, file: 'AGENTS.md' });
  else report.fail('AGENTS_ENTRY_REFERENCE_MISSING', `AGENTS.md does not reference the NSES entry point (${entry}).`, { section, file: 'AGENTS.md' });

  if (ctx.nsesAvailable !== false) {
    for (const ref of refs) {
      if (!statSafe(path.join(projectRoot, ref))?.isFile()) report.fail('AGENTS_BROKEN_REFERENCE', `AGENTS.md references ${ref}, which does not exist.`, { section, file: 'AGENTS.md' });
    }
  }
  ctx.agentsProfiles = profileNamesFrom(refs, ctx);
  if (!ctx.agentsProfiles.size) report.fail('AGENTS_PROFILE_REFERENCE_MISSING', 'AGENTS.md does not reference a technology profile.', { section, file: 'AGENTS.md' });
  else report.pass('AGENTS_PROFILE_REFERENCE', `AGENTS.md references profile(s): ${[...ctx.agentsProfiles].join(', ')}.`, { section, file: 'AGENTS.md' });
}

function checkProfileCoverage(ctx) {
  const { report, manifest } = ctx;
  const section = S.profiles;
  if (!ctx.stacks?.length) return;
  const referenced = new Set([...ctx.claudeProfiles, ...ctx.agentsProfiles]);
  for (const stack of ctx.stacks) {
    const display = manifest.profiles[stack].displayName;
    if (referenced.has(stack)) report.pass('PROFILE_MATCHES_STACK', `The ${display} profile is referenced for the detected ${display} stack.`, { section });
    else report.fail('PROFILE_NOT_CONFIGURED', `${display} was detected but profiles/${stack}.md is not referenced from CLAUDE.md or AGENTS.md.`, { section });
  }
  for (const name of referenced) {
    if (ctx.stacks.includes(name)) continue;
    const hint = name === 'react' && ctx.stacks.includes('nextjs') ? ' The Next.js profile already includes the React standards.' : '';
    report.warn('PROFILE_STACK_MISMATCH', `Profile '${name}' is referenced but that technology was not detected in package.json.${hint}`, { section });
  }
}

function checkTooling(ctx) {
  const { report, read, projectRoot, pkg } = ctx;
  const section = S.tooling;
  const has = (p) => exists(projectRoot, p);
  const deps = ctx.deps ?? {};

  if (pkg) {
    const scripts = pkg.scripts ?? {};
    for (const name of ['lint', 'typecheck', 'test', 'build']) {
      if (scripts[name]) report.pass('TOOLING_SCRIPT', `package.json defines a '${name}' script.`, { section, file: 'package.json' });
      else report.warn('TOOLING_SCRIPT_MISSING', `package.json has no '${name}' script.`, { section, file: 'package.json' });
    }
    const lockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb', 'npm-shrinkwrap.json'];
    if (lockfiles.some(has)) report.pass('TOOLING_LOCKFILE', 'A package-manager lockfile is present.', { section });
    else report.warn('TOOLING_LOCKFILE_MISSING', 'No lockfile found. Commit the lockfile for the selected package manager.', { section });

    const testRunners = ['jest', 'vitest', '@playwright/test', 'cypress', 'mocha', '@nestjs/testing'];
    const runner = testRunners.find((d) => d in deps);
    if (runner) report.pass('TOOLING_TEST_FRAMEWORK', `Test tooling dependency found (${runner}).`, { section });
    else report.warn('TOOLING_TEST_FRAMEWORK_MISSING', 'No common test framework dependency found (jest, vitest, Playwright, Cypress, mocha).', { section, file: 'package.json' });
  }

  if (ctx.typescript) {
    const tsconfig = read('tsconfig.json');
    if (tsconfig === null) report.warn('TOOLING_TSCONFIG_MISSING', 'No tsconfig.json found.', { section });
    else {
      const clean = stripJsonComments(tsconfig);
      const extendsMatch = clean.match(/"extends"\s*:\s*(\[[^\]]*\]|"[^"]*")/);
      if (/"strict"\s*:\s*true/.test(clean)) report.pass('TOOLING_TS_STRICT', 'tsconfig.json enables strict mode.', { section, file: 'tsconfig.json' });
      else if (/"strict"\s*:\s*false/.test(clean)) report.warn('TOOLING_TS_STRICT_DISABLED', 'tsconfig.json explicitly disables strict mode. Plan a safe migration.', { section, file: 'tsconfig.json' });
      else if (extendsMatch?.[1].includes(`${ctx.mount}/tooling/typescript/`)) report.pass('TOOLING_TS_STRICT', 'tsconfig.json extends the NSES TypeScript base (strict mode).', { section, file: 'tsconfig.json' });
      else if (extendsMatch) report.info('TOOLING_TS_STRICT_INHERITED', `tsconfig.json does not set strict directly; it may be inherited from ${extendsMatch[1]}. Verify with: npx tsc --showConfig`, { section, file: 'tsconfig.json' });
      else report.warn('TOOLING_TS_STRICT_MISSING', 'TypeScript strict mode is not enabled in tsconfig.json.', { section, file: 'tsconfig.json' });
    }
  }

  const flatConfigs = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].map((e) => `eslint.config.${e}`);
  const legacyConfigs = ['.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml'];
  if (flatConfigs.some(has)) report.pass('TOOLING_ESLINT', 'ESLint flat config found.', { section });
  else if (legacyConfigs.some(has) || pkg?.eslintConfig) report.warn('TOOLING_ESLINT_LEGACY', 'Legacy .eslintrc configuration found. ESLint 9+ uses flat config (eslint.config.*); see NSES tooling/eslint.', { section });
  else report.warn('TOOLING_ESLINT_MISSING', 'No ESLint configuration found. See NSES tooling/eslint.', { section });

  const prettierConfigs = ['.prettierrc', '.prettierrc.json', '.prettierrc.yml', '.prettierrc.yaml', '.prettierrc.json5', '.prettierrc.js', '.prettierrc.mjs', '.prettierrc.cjs', '.prettierrc.toml', 'prettier.config.js', 'prettier.config.mjs', 'prettier.config.cjs', 'prettier.config.ts'];
  if (prettierConfigs.some(has) || pkg?.prettier) report.pass('TOOLING_PRETTIER', 'Prettier configuration found.', { section });
  else report.warn('TOOLING_PRETTIER_MISSING', 'No Prettier configuration found. See NSES tooling/prettier.', { section });

  if (has('sonar-project.properties')) report.pass('TOOLING_SONAR', 'sonar-project.properties found.', { section });
  else report.info('TOOLING_SONAR_MISSING', 'No sonar-project.properties found (optional if static analysis is configured elsewhere). See NSES tooling/sonar.', { section });

  const workflowDir = path.join(projectRoot, '.github', 'workflows');
  const workflows = statSafe(workflowDir)?.isDirectory() ? fs.readdirSync(workflowDir).filter((f) => /\.ya?ml$/i.test(f)) : [];
  if (workflows.length || has('.gitlab-ci.yml') || has('azure-pipelines.yml') || has('bitbucket-pipelines.yml')) {
    report.pass('TOOLING_CI', 'CI configuration found.', { section });
    const runsChecker = workflows.some((f) => (read(`.github/workflows/${f}`) ?? '').includes('check-project-compliance'));
    if (workflows.length && !runsChecker) report.info('TOOLING_CI_NSES_CHECK', 'No GitHub workflow runs the NSES project checker. See NSES tooling/ci/github-actions-quality.yml.', { section });
  } else report.warn('TOOLING_CI_MISSING', 'No CI configuration detected.', { section });

  if (has('.github/dependabot.yml') || has('.github/dependabot.yaml') || has('renovate.json') || has('.github/renovate.json')) {
    report.pass('TOOLING_DEPENDENCY_UPDATES', 'Automated dependency update configuration found.', { section });
  } else report.info('TOOLING_DEPENDENCY_UPDATES_MISSING', 'No Dependabot or Renovate configuration found. See security/dependency-security.md.', { section });
}

function checkHygiene(ctx) {
  const { report, read } = ctx;
  const section = S.hygiene;
  const gitignore = read('.gitignore');
  if (gitignore === null) {
    report.warn('HYGIENE_GITIGNORE_MISSING', 'No .gitignore found.', { section });
    return;
  }
  const lines = gitignore.split(/\r?\n/).map((l) => l.trim());
  if (lines.some((l) => /^\/?\.env(\*|\.\*|\.local|\b)/.test(l) || l === '*.env')) report.pass('HYGIENE_GITIGNORE_ENV', '.gitignore ignores environment files.', { section, file: '.gitignore' });
  else report.warn('HYGIENE_GITIGNORE_ENV_MISSING', '.gitignore does not appear to ignore .env files. Ignore them and allow only placeholder .env.example files.', { section, file: '.gitignore' });
}

/** Claude Code permission deny rules are the only hard block on an agent reading secret files. */
function checkAgentSecretAccess(ctx) {
  const { report, read } = ctx;
  const section = S.hygiene;
  const file = '.claude/settings.json';
  const raw = read(file);
  let deny = [];
  try {
    deny = JSON.parse(raw ?? '{}')?.permissions?.deny ?? [];
  } catch {
    report.warn('AI_SETTINGS_INVALID', `${file} is not valid JSON, so Claude Code ignores its permission rules.`, { section, file });
    return;
  }
  if (Array.isArray(deny) && deny.some((r) => typeof r === 'string' && /^Read\([^)]*\.env/.test(r))) {
    report.pass('AI_SECRET_DENY', `${file} blocks Claude Code from reading .env files.`, { section, file });
  } else {
    report.warn('AI_SECRET_DENY_MISSING', `Claude Code is not blocked from reading .env and other secret files. Copy ai-instructions/claude-settings.json from NSES to ${file}.`, { section, file });
  }
}

export function checkProject({ projectRoot, flags = {} }) {
  const root = path.resolve(projectRoot);
  if (!statSafe(root)?.isDirectory()) throw new UsageError(`Project directory not found: ${projectRoot}`);

  const report = new Report(`NSES project integration check — ${path.basename(root)}`);
  report.info('SCOPE', 'Configuration check only: verifies NSES integration and tooling presence; it is not a security or code-quality audit.');
  const ctx = {
    report,
    flags,
    projectRoot: root,
    manifest: loadManifest(NSES_ROOT),
    read: makeReader(root),
  };
  ctx.hasClaude = exists(root, 'CLAUDE.md');
  ctx.hasAgents = exists(root, 'AGENTS.md');

  detectStack(ctx);
  checkNses(ctx);
  checkClaude(ctx);
  checkAgents(ctx);
  checkProfileCoverage(ctx);
  checkTooling(ctx);
  checkHygiene(ctx);
  checkAgentSecretAccess(ctx);
  return report;
}

export function main(argv) {
  const { flags, positionals } = parseArgs(argv, { booleans: ['report', 'json', 'verbose', 'help'], strings: ['standards-path'] });
  if (flags.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (positionals.length > 1) throw new UsageError('Pass at most one project path.');
  const report = checkProject({ projectRoot: positionals[0] ?? process.cwd(), flags });
  return emit(report, { json: flags.json, verbose: flags.verbose, reportOnly: flags.report, footer: DISCLAIMER });
}

if (isMain(import.meta.url)) runCli(main, USAGE);
