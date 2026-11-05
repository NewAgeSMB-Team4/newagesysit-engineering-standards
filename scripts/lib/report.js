/**
 * Shared result model and console/JSON reporting for NSES tools.
 *
 * Levels:
 * - PASS:    a check ran and succeeded.
 * - INFO:    context only; never affects the exit code.
 * - WARNING: should be fixed; does not fail the run.
 * - FAIL:    a mandatory check failed; the run exits non-zero (unless report-only).
 */

export const Level = Object.freeze({ PASS: 'PASS', INFO: 'INFO', WARNING: 'WARNING', FAIL: 'FAIL' });

const ORDER = { FAIL: 0, WARNING: 1, INFO: 2, PASS: 3 };

export class Report {
  constructor(title) {
    this.title = title;
    this.results = [];
  }

  add(level, code, message, location = {}) {
    if (!Level[level]) throw new Error(`Unknown level: ${level}`);
    this.results.push({ level, code, message, ...location });
    return this;
  }

  pass(code, message, location) {
    return this.add(Level.PASS, code, message, location);
  }

  info(code, message, location) {
    return this.add(Level.INFO, code, message, location);
  }

  warn(code, message, location) {
    return this.add(Level.WARNING, code, message, location);
  }

  fail(code, message, location) {
    return this.add(Level.FAIL, code, message, location);
  }

  /** Append issues produced by a library function (objects with level/code/message/file/line). */
  addAll(issues, extra = {}) {
    for (const { level, code, message, ...location } of issues) this.add(level, code, message, { ...location, ...extra });
    return this;
  }

  counts() {
    const counts = { PASS: 0, INFO: 0, WARNING: 0, FAIL: 0 };
    for (const r of this.results) counts[r.level] += 1;
    return counts;
  }

  get failed() {
    return this.results.some((r) => r.level === Level.FAIL);
  }

  toJSON() {
    return { title: this.title, summary: this.counts(), passed: !this.failed, results: this.results };
  }
}

function formatLocation(r) {
  if (!r.file) return '';
  return r.line ? ` (${r.file}:${r.line})` : ` (${r.file})`;
}

/**
 * Render a report as text.
 * @param {Report} report
 * @param {{ verbose?: boolean, groupBy?: 'section'|'none', footer?: string }} options
 */
export function formatText(report, { verbose = false, footer } = {}) {
  const lines = [report.title, '='.repeat(report.title.length)];
  const visible = report.results
    .filter((r) => verbose || r.level !== Level.PASS)
    .sort((a, b) => (a.section ?? '').localeCompare(b.section ?? '') || ORDER[a.level] - ORDER[b.level]);

  let currentSection;
  for (const r of visible) {
    if (r.section && r.section !== currentSection) {
      currentSection = r.section;
      lines.push('', `## ${r.section}`);
    }
    lines.push(`[${r.level}] ${r.code}: ${r.message}${formatLocation(r)}`);
  }

  const c = report.counts();
  lines.push('', `Summary: ${c.PASS} passed, ${c.WARNING} warning(s), ${c.FAIL} failure(s), ${c.INFO} info`);
  if (!verbose && c.PASS > 0) lines.push('(Use --verbose to list passed checks.)');
  lines.push(report.failed ? 'Result: FAIL' : 'Result: PASS');
  if (footer) lines.push('', footer);
  return lines.join('\n');
}

/** Print a report and return the exit code the CLI should use. */
export function emit(report, { json = false, verbose = false, reportOnly = false, footer } = {}) {
  if (json) process.stdout.write(`${JSON.stringify({ ...report.toJSON(), footer }, null, 2)}\n`);
  else process.stdout.write(`${formatText(report, { verbose, footer })}\n`);
  return report.failed && !reportOnly ? 1 : 0;
}
