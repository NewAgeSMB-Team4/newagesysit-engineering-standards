#!/usr/bin/env node
/**
 * Dependency-free lint and formatting checks for the NSES repository.
 *
 * - JavaScript (.js/.mjs/.cjs): syntax check with `node --check` (files are parsed, never executed).
 * - JSON: must parse.
 * - YAML: no tab indentation (tabs are invalid YAML indentation).
 * - Markdown: final newline, no unclosed code fences (which would hide imports),
 *   no trailing whitespace other than a two-space hard line break, one H1 heading.
 * - All text files: no merge-conflict markers.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Report, emit } from './lib/report.js';
import { NSES_ROOT, isMain, loadManifest, parseArgs, rel, runCli } from './lib/files.js';

export const USAGE = `Usage: node scripts/lint-repo.js [--root <dir>] [--json] [--verbose]`;

const TEXT = /\.(md|js|mjs|cjs|json|ya?ml|properties|example)$/i;

function listFiles(root, ignore) {
  const out = [];
  const skip = (r) => ignore.some((i) => r === i || r.startsWith(`${i}/`));
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const r = rel(root, abs);
      if (skip(r)) continue;
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile() && (TEXT.test(entry.name) || entry.name === 'VERSION')) out.push(abs);
    }
  };
  walk(root);
  return out.sort((a, b) => a.localeCompare(b));
}

function lintMarkdown(file, text, report) {
  const lines = text.split(/\r?\n/);
  let fence = null;
  let fenceLine = 0;
  let h1 = 0;
  lines.forEach((line, i) => {
    const n = i + 1;
    const f = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && line.trim() === f[1]) fence = null;
      return;
    }
    if (f) {
      fence = f[1];
      fenceLine = n;
      return;
    }
    if (/^#\s/.test(line)) h1 += 1;
    const trailing = line.match(/[ \t]+$/)?.[0];
    if (trailing && !(trailing === '  ' && line.trim() !== '')) {
      report.fail('MD_TRAILING_WHITESPACE', 'Trailing whitespace (only a two-space hard line break is allowed).', { file, line: n });
    }
  });
  if (fence) report.fail('MD_UNCLOSED_FENCE', `Code fence opened on line ${fenceLine} is never closed; everything after it is treated as code.`, { file, line: fenceLine });
  if (h1 > 1) report.warn('MD_MULTIPLE_H1', `Found ${h1} top-level headings; use one '# ' title per document.`, { file });
}

export function lintRepo({ root = NSES_ROOT } = {}) {
  const report = new Report('NSES repository lint');
  const ignore = loadManifest(root).ignore ?? [];
  const files = listFiles(root, ignore);
  let js = 0;

  for (const abs of files) {
    const file = rel(root, abs);
    const text = fs.readFileSync(abs, 'utf8');

    if (text.length && !text.endsWith('\n')) report.fail('FILE_NO_FINAL_NEWLINE', 'File does not end with a newline.', { file });
    if (/^(<{7}|>{7}|={7})( |$)/m.test(text) && !file.endsWith('.md')) report.fail('FILE_CONFLICT_MARKER', 'Merge-conflict marker found.', { file });

    if (/\.(js|mjs|cjs)$/i.test(file)) {
      js += 1;
      const res = spawnSync(process.execPath, ['--check', abs], { encoding: 'utf8' });
      if (res.status !== 0) report.fail('JS_SYNTAX', (res.stderr || 'Syntax check failed').trim().split('\n').slice(0, 4).join(' | '), { file });
    } else if (/\.json$/i.test(file)) {
      try {
        JSON.parse(text);
      } catch (err) {
        report.fail('JSON_INVALID', `Invalid JSON: ${err.message}`, { file });
      }
    } else if (/\.ya?ml$/i.test(file)) {
      text.split(/\r?\n/).forEach((line, i) => {
        if (/^\t/.test(line)) report.fail('YAML_TAB_INDENT', 'Tab indentation is not valid YAML.', { file, line: i + 1 });
      });
    } else if (/\.md$/i.test(file)) lintMarkdown(file, text, report);
  }
  report.info('LINT_SUMMARY', `Checked ${files.length} file(s), including ${js} JavaScript file(s).`);
  return report;
}

export function main(argv) {
  const { flags } = parseArgs(argv, { booleans: ['json', 'verbose', 'help'], strings: ['root'] });
  if (flags.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  return emit(lintRepo({ root: flags.root ? path.resolve(flags.root) : NSES_ROOT }), { json: flags.json, verbose: flags.verbose });
}

if (isMain(import.meta.url)) runCli(main, USAGE);
