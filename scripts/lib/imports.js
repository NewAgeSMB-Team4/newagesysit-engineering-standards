/**
 * Import-graph analysis for Claude Code-style `@path` imports.
 *
 * Builds the graph reachable from a set of entry files, resolving each import
 * relative to the importing file, and reports broken, unsafe, duplicate and
 * circular imports. Only Markdown targets are read and followed; other targets
 * are checked for existence only and their contents are never read.
 */
import os from 'node:os';
import path from 'node:path';
import { scanMarkdown } from './markdown.js';
import { Level } from './report.js';
import { caseMismatch, isInside, readText, rel, statSafe, toPosix } from './files.js';

const SENSITIVE_BASENAME = [
  /^\.env(\..+)?$/i,
  /\.(pem|key|p12|pfx|jks|keystore)$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)$/i,
  /^\.npmrc$/i,
  /^\.netrc$/i,
  /^credentials(\.json)?$/i,
];
const SAFE_EXAMPLE = /\.(example|sample|template)$/i;
const PROFILE_PATH = /(^|\/)profiles\/[^/]+\.md$/;

export function isSensitivePath(p) {
  const base = path.basename(p);
  if (SAFE_EXAMPLE.test(base)) return false;
  return SENSITIVE_BASENAME.some((re) => re.test(base));
}

/**
 * Resolve an import target to an absolute path.
 * @param {string} fromAbs   importing file
 * @param {string} target    import path without the leading `@`
 * @param {{ root: string, mountPath?: string }} ctx
 *   mountPath: for NSES template files, a consumer-side prefix (e.g. `.engineering/standards`)
 *   that maps onto `root`.
 */
export function resolveImport(fromAbs, target, { root, mountPath } = {}) {
  if (target.startsWith('~/')) return { abs: path.join(os.homedir(), target.slice(2)), kind: 'home' };
  if (mountPath && (target === mountPath || target.startsWith(`${mountPath}/`))) {
    return { abs: path.resolve(root, target.slice(mountPath.length + 1)), kind: 'mounted' };
  }
  if (target.startsWith('/') || path.isAbsolute(target)) return { abs: path.resolve(target), kind: 'absolute' };
  return { abs: path.resolve(path.dirname(fromAbs), target), kind: 'relative' };
}

/**
 * @param {object} options
 * @param {string} options.root            Allowed root; imports must resolve inside it.
 * @param {string[]} options.entries       Absolute paths of Markdown files to start from.
 * @param {Record<string,{mountPath:string}>} [options.templateFiles] Root-relative template paths.
 * @param {number} [options.maxDepth]      Warn when an import chain exceeds this many hops.
 * @param {string[]} [options.depthRoots]  Files whose chain depth is checked (defaults to graph roots).
 * @returns {{ issues: object[], graph: Map<string, object[]>, reachable: Set<string> }}
 *   graph keys and `reachable` entries are root-relative POSIX paths.
 */
export function analyzeImports({ root, entries, templateFiles = {}, maxDepth = 5, depthRoots }) {
  const issues = [];
  const graph = new Map(); // abs -> edges
  const issue = (level, code, message, file, line) => issues.push({ level, code, message, file: rel(root, file), line });

  const parse = (abs) => {
    if (graph.has(abs)) return graph.get(abs);
    const edges = [];
    graph.set(abs, edges);
    let content;
    try {
      content = readText(abs);
    } catch (err) {
      issue(Level.FAIL, 'IMPORT_READ_ERROR', `Cannot read file: ${err.code ?? err.message}`, abs);
      return edges;
    }
    const mountPath = templateFiles[rel(root, abs)]?.mountPath;
    const seen = new Map();
    for (const imp of scanMarkdown(content).imports) {
      const edge = { ...imp, ok: false, follow: false };
      edges.push(edge);
      const where = `@${imp.target}`;

      if (seen.has(imp.target)) {
        issue(Level.WARNING, 'IMPORT_DUPLICATE', `${where} is imported more than once (first on line ${seen.get(imp.target)}).`, abs, imp.line);
      } else seen.set(imp.target, imp.line);

      const { abs: target, kind } = resolveImport(abs, imp.target, { root, mountPath });
      edge.abs = target;
      edge.resolved = isInside(root, target) ? rel(root, target) : toPosix(target);

      if (kind === 'home' || !isInside(root, target)) {
        issue(Level.FAIL, 'IMPORT_OUTSIDE_ROOT', `${where} resolves outside the allowed root (${kind === 'home' ? 'home directory' : 'outside repository'}).`, abs, imp.line);
        continue;
      }
      if (isSensitivePath(target)) {
        issue(Level.FAIL, 'IMPORT_SENSITIVE_FILE', `${where} would load a secrets/credentials file into AI context. Remove this import.`, abs, imp.line);
        continue;
      }
      const stat = statSafe(target);
      if (!stat) {
        const isProfile = PROFILE_PATH.test(edge.resolved);
        const hint = !path.extname(target) && statSafe(`${target}.md`) ? ` Did you mean @${imp.target}.md?` : '';
        issue(
          Level.FAIL,
          isProfile ? 'IMPORT_MISSING_PROFILE' : 'IMPORT_NOT_FOUND',
          `${where} ${isProfile ? 'references a technology profile that does not exist' : 'does not exist'} (resolved to ${edge.resolved}).${hint}`,
          abs,
          imp.line,
        );
        continue;
      }
      if (stat.isDirectory()) {
        issue(Level.FAIL, 'IMPORT_IS_DIRECTORY', `${where} points to a directory, not a file. Import specific files instead.`, abs, imp.line);
        continue;
      }
      const actual = caseMismatch(root, target);
      if (actual) {
        issue(Level.FAIL, 'IMPORT_CASE_MISMATCH', `${where} differs in letter case from the file on disk (${actual}); this breaks on case-sensitive file systems.`, abs, imp.line);
        continue;
      }
      if (kind === 'absolute') {
        issue(Level.WARNING, 'IMPORT_ABSOLUTE_PATH', `${where} uses an absolute path; use a path relative to the importing file so it works on every machine.`, abs, imp.line);
      }
      edge.ok = true;
      edge.follow = /\.md$/i.test(target);
    }
    return edges;
  };

  // Depth-first traversal with three-colour marking for cycle detection.
  const state = new Map();
  const height = new Map();
  const reportedCycles = new Set();
  const visit = (abs, stack) => {
    if (state.get(abs) === 'done') return height.get(abs);
    state.set(abs, 'visiting');
    stack.push(abs);
    let h = 0;
    for (const edge of parse(abs)) {
      if (!edge.follow) continue;
      if (state.get(edge.abs) === 'visiting') {
        const cycle = [...stack.slice(stack.indexOf(edge.abs)), edge.abs].map((f) => rel(root, f));
        const key = [...new Set(cycle)].sort().join('|');
        if (!reportedCycles.has(key)) {
          reportedCycles.add(key);
          issue(Level.FAIL, 'IMPORT_CIRCULAR', `Circular import: ${cycle.join(' -> ')}`, abs, edge.line);
        }
        continue;
      }
      h = Math.max(h, 1 + visit(edge.abs, stack));
    }
    stack.pop();
    state.set(abs, 'done');
    height.set(abs, h);
    return h;
  };
  for (const entry of entries) visit(path.resolve(entry), []);

  // Depth check: by default only for files nothing else imports, to avoid repeating one long chain.
  const inbound = new Set();
  for (const edges of graph.values()) for (const e of edges) if (e.follow) inbound.add(e.abs);
  const roots = depthRoots ? depthRoots.map((p) => path.resolve(p)) : entries.map((p) => path.resolve(p)).filter((p) => !inbound.has(p));
  for (const r of roots) {
    const h = height.get(r) ?? 0;
    if (h > maxDepth) {
      issue(Level.WARNING, 'IMPORT_DEPTH_EXCEEDED', `Import chain is ${h} hops deep; Claude Code follows at most ${maxDepth} hops, so deeper files may not load.`, r);
    }
  }

  const relGraph = new Map();
  for (const [abs, edges] of graph) relGraph.set(rel(root, abs), edges);
  return { issues, graph: relGraph, reachable: new Set(relGraph.keys()) };
}
