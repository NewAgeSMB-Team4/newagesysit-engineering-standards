import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isImportCandidate, maskInlineCode, scanMarkdown } from '../../scripts/lib/markdown.js';

const targets = (md) => scanMarkdown(md).imports.map((i) => i.target);

describe('scanMarkdown imports', () => {
  it('detects relative, root-relative and bare Markdown imports with line numbers', () => {
    const { imports } = scanMarkdown('# T\n\n@../quality/testing-standards.md\n@./local.md\n@docs/guide.md\n@README.md\n');
    assert.deepEqual(imports.map((i) => i.target), ['../quality/testing-standards.md', './local.md', 'docs/guide.md', 'README.md']);
    assert.equal(imports[0].line, 3);
    assert.equal(imports[0].column, 1);
  });

  it('detects imports inside prose and list items', () => {
    assert.deepEqual(targets('Read @../a.md first.\n- @../b.md\n  - @../c.md\n'), ['../a.md', '../b.md', '../c.md']);
  });

  it('strips trailing sentence punctuation', () => {
    assert.deepEqual(targets('See @../a.md, then @../b.md. Or (@../c.md)\n'), ['../a.md', '../b.md']);
  });

  it('ignores fenced code blocks with backticks and tildes', () => {
    const md = ['```md', '@../in-code.md', '```', '~~~', '@../in-tilde.md', '~~~', '@../real.md'].join('\n');
    assert.deepEqual(targets(md), ['../real.md']);
  });

  it('does not close a 4-backtick fence on an inner 3-backtick fence', () => {
    const md = ['````md', '```', '@../still-code.md', '```', '````', '@../after.md'].join('\n');
    assert.deepEqual(targets(md), ['../after.md']);
  });

  it('ignores inline code spans, including double-backtick spans', () => {
    assert.deepEqual(targets('Use `@../x.md` or ``@../y.md`` but import @../z.md\n'), ['../z.md']);
  });

  it('ignores indented code blocks but not indented list continuations', () => {
    assert.deepEqual(targets('Text\n\n    @../code.md\n'), []);
    assert.deepEqual(targets('- item\n\n    @../list-continuation.md\n'), ['../list-continuation.md']);
  });

  it('ignores single-line and multi-line HTML comments', () => {
    assert.deepEqual(targets('<!-- @../a.md -->\n<!--\n@../b.md\n-->\n@../c.md\n'), ['../c.md']);
  });

  it('does not treat emails, npm scopes, decorators or mentions as imports', () => {
    const md = 'Mail dev@example.com or ops@newagesysit.md. Install @nestjs/common and @types/node.\nUse @Injectable() and ask @john.doe or @team.\n';
    assert.deepEqual(targets(md), []);
  });

  it('does not treat link text or link targets as imports', () => {
    assert.deepEqual(targets('[@../a.md](../a.md) and [docs](@../b.md)\n'), []);
  });

  it('flags directory-style imports so they can be validated', () => {
    assert.deepEqual(targets('@../security/\n'), ['../security/']);
  });

  it('handles CRLF line endings and a BOM', () => {
    assert.deepEqual(targets('﻿# T\r\n@../a.md\r\n```\r\n@../b.md\r\n```\r\n'), ['../a.md']);
  });
});

describe('scanMarkdown references', () => {
  it('collects code-span paths and relative links but not URLs or anchors', () => {
    const md = 'See `profiles/nextjs.md`, `types.ts`, [x](../a.md#sec), [y](https://e.com), [z](#top).\n```\n`ignored/in-code.md`\n```\n';
    const refs = scanMarkdown(md).references.map((r) => `${r.kind}:${r.target}`);
    assert.deepEqual(refs, ['code:profiles/nextjs.md', 'link:../a.md']);
  });
});

describe('isImportCandidate', () => {
  for (const ok of ['./a', '../a.md', '/abs/a.md', '~/x.md', 'a.md', 'dir/file.yaml']) {
    it(`accepts ${ok}`, () => assert.equal(isImportCandidate(ok), true));
  }
  for (const no of ['nestjs/common', 'john.doe', 'Injectable()', 'https://x.md', 'user@host.md', '']) {
    it(`rejects '${no}'`, () => assert.equal(isImportCandidate(no), false));
  }
});

describe('maskInlineCode', () => {
  it('preserves column positions and returns span contents', () => {
    const { masked, spans } = maskInlineCode('a `b` c');
    assert.equal(masked.length, 7);
    assert.equal(masked, 'a     c');
    assert.deepEqual(spans.map((s) => s.content), ['b']);
  });

  it('leaves an unmatched backtick as text', () => {
    assert.equal(maskInlineCode('a ` b').masked, 'a ` b');
  });
});
