/**
 * Minimal, dependency-free Markdown scanner for NSES tooling.
 *
 * It recognises just enough Markdown structure to tell real Claude Code-style
 * file imports (`@path/to/file.md`) and documentation path references apart
 * from code examples, email addresses, npm scopes and ordinary prose.
 *
 * Content ignored for import detection:
 * - fenced code blocks (``` and ~~~, including longer fences)
 * - indented code blocks (4+ spaces after a blank line, outside lists)
 * - inline code spans of any backtick length
 * - HTML comments (single- and multi-line)
 *
 * Known limitations (documented in scripts/README.md): inline code spans that
 * span multiple lines are not tracked across lines, and HTML blocks other than
 * comments are scanned as text.
 */

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const LIST_ITEM = /^\s{0,3}([-*+]|\d{1,9}[.)])\s+/;
const INDENTED_CODE = /^( {4,}|\t)/;

/** Extensions that make a bare `@name.ext` token an import even without a slash. */
const DOC_EXTENSIONS = /\.(md|mdx|markdown|txt)$/i;
/** Any file extension, used when the token also contains a path separator. */
const ANY_EXTENSION = /\.[A-Za-z0-9]{1,10}$/;
const EXPLICIT_PATH_PREFIX = /^(\.{1,2}\/|\/|~\/)/;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>'"]+$/;

/** Inline-code content that looks like a repository file path. */
const CODE_PATH = /^[A-Za-z0-9_.\/-]+\.(md|mdx|mjs|cjs|js|ts|json|ya?ml|properties|example)$/;
const MARKDOWN_LINK = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'(][^)]*)?\)/g;
const IMPORT_TOKEN = /(^|\s)@(\S+)/g;

/**
 * Decide whether the text following an `@` is meant as a file import.
 * Accepts `./x`, `../x`, `/x`, `~/x`, `name.md`, and `dir/name.ext`.
 * Rejects npm scopes (`@nestjs/common`), mentions (`@john.doe`), decorators
 * (`@Injectable()`), and emails (never reached: `@` must follow whitespace).
 */
export function isImportCandidate(token) {
  if (!token || token.includes('://') || token.includes('@')) return false;
  if (/[()<>{}\[\]`*]/.test(token)) return false;
  if (EXPLICIT_PATH_PREFIX.test(token)) return true;
  if (DOC_EXTENSIONS.test(token)) return true;
  return token.includes('/') && ANY_EXTENSION.test(token);
}

/** Strip trailing sentence punctuation, but keep a meaningful trailing slash or dot-segment. */
function cleanToken(raw) {
  let token = raw.replace(TRAILING_PUNCTUATION, '');
  if (token === '' || token === '.' || token === '..') token = raw.replace(/[,;:!?)\]}>'"]+$/, '');
  return token;
}

/**
 * Replace inline code spans with spaces (keeping column positions) and return
 * the span contents separately.
 */
export function maskInlineCode(line) {
  const spans = [];
  let out = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '`') {
      out += line[i];
      i += 1;
      continue;
    }
    let runEnd = i;
    while (line[runEnd] === '`') runEnd += 1;
    const run = line.slice(i, runEnd);
    // A closing run must have exactly the same length and not be part of a longer run.
    let search = runEnd;
    let close = -1;
    while (search < line.length) {
      const idx = line.indexOf(run, search);
      if (idx === -1) break;
      const before = line[idx - 1];
      const after = line[idx + run.length];
      if (before !== '`' && after !== '`') {
        close = idx;
        break;
      }
      search = idx + 1;
      while (line[search] === '`') search += 1;
    }
    if (close === -1) {
      out += run;
      i = runEnd;
      continue;
    }
    const content = line.slice(runEnd, close);
    spans.push({ content: content.trim(), column: runEnd + 1 });
    out += ' '.repeat(close + run.length - i);
    i = close + run.length;
  }
  return { masked: out, spans };
}

/**
 * Scan Markdown content once and return its imports and documentation references.
 *
 * @param {string} content
 * @returns {{ imports: Array<{target:string, raw:string, line:number, column:number}>,
 *             references: Array<{target:string, kind:'code'|'link', line:number, column:number}> }}
 */
export function scanMarkdown(content) {
  const imports = [];
  const references = [];
  const lines = content.replace(/^﻿/, '').split(/\r?\n/);

  let fence = null; // { char, length }
  let inComment = false;
  let prevBlank = true;
  let prevIndentedCode = false;
  let inList = false;

  lines.forEach((rawLine, index) => {
    const lineNo = index + 1;
    const isBlank = rawLine.trim() === '';

    if (fence) {
      const m = rawLine.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (m && m[1][0] === fence.char && m[1].length >= fence.length) fence = null;
      prevBlank = false;
      return;
    }

    let line = rawLine;

    // HTML comments, possibly spanning lines.
    if (inComment) {
      const end = line.indexOf('-->');
      if (end === -1) return;
      line = ' '.repeat(end + 3) + line.slice(end + 3);
      inComment = false;
    }
    line = line.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));
    const openComment = line.indexOf('<!--');
    if (openComment !== -1) {
      line = line.slice(0, openComment);
      inComment = true;
    }

    const fenceMatch = line.match(FENCE_OPEN);
    if (fenceMatch && !(fenceMatch[1][0] === '`' && fenceMatch[2].includes('`'))) {
      fence = { char: fenceMatch[1][0], length: fenceMatch[1].length };
      prevBlank = false;
      prevIndentedCode = false;
      return;
    }

    if (isBlank) {
      prevBlank = true;
      return;
    }

    if (LIST_ITEM.test(line)) inList = true;
    else if (!/^\s/.test(line)) inList = false;

    const indentedCode = INDENTED_CODE.test(line) && !inList && (prevBlank || prevIndentedCode);
    prevIndentedCode = indentedCode;
    prevBlank = false;
    if (indentedCode) return;

    const { masked, spans } = maskInlineCode(line);

    for (const span of spans) {
      // Bare names like `utils.ts` are usually generic examples; only paths or Markdown docs count.
      if (CODE_PATH.test(span.content) && (span.content.includes('/') || /\.mdx?$/i.test(span.content))) {
        references.push({ target: span.content, kind: 'code', line: lineNo, column: span.column });
      }
    }

    for (const m of masked.matchAll(MARKDOWN_LINK)) {
      const href = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) continue;
      let target = href.split('#')[0].split('?')[0];
      try {
        target = decodeURI(target);
      } catch {
        // Keep the raw href; a malformed escape is reported as an unresolved reference.
      }
      if (target) references.push({ target, kind: 'link', line: lineNo, column: m.index + 1 });
    }

    // Links were already captured; blank them so `[@x](y)` style text is not misread.
    const importText = masked.replace(MARKDOWN_LINK, (m) => ' '.repeat(m.length));
    for (const m of importText.matchAll(IMPORT_TOKEN)) {
      const raw = m[2];
      const target = cleanToken(raw);
      if (!isImportCandidate(target)) continue;
      imports.push({ target, raw: `@${raw}`, line: lineNo, column: m.index + m[1].length + 1 });
    }
  });

  return { imports, references };
}
