import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it, mock } from 'node:test';
import { analyzeImports, isSensitivePath, resolveImport } from '../../scripts/lib/imports.js';
import { cleanup, tempDir, writeFiles } from '../helpers.js';

after(cleanup);

function analyze(files, entry = 'entry.md', options = {}) {
  const root = tempDir();
  writeFiles(root, files);
  const result = analyzeImports({ root, entries: [path.join(root, entry)], ...options });
  return { root, ...result, codes: result.issues.map((i) => i.code) };
}

describe('analyzeImports', () => {
  it('passes valid nested imports and records the graph', () => {
    const { issues, graph } = analyze({ 'entry.md': '@a/one.md\n', 'a/one.md': '@../b/two.md\n', 'b/two.md': '# leaf\n' });
    assert.deepEqual(issues, []);
    assert.deepEqual([...graph.keys()].sort(), ['a/one.md', 'b/two.md', 'entry.md']);
    assert.equal(graph.get('a/one.md')[0].resolved, 'b/two.md');
  });

  it('reports missing files with the importing file and line', () => {
    const { issues } = analyze({ 'entry.md': '# T\n\n@./missing.md\n' });
    assert.equal(issues[0].code, 'IMPORT_NOT_FOUND');
    assert.equal(issues[0].file, 'entry.md');
    assert.equal(issues[0].line, 3);
  });

  it('suggests a .md extension when it is missing', () => {
    const { issues } = analyze({ 'entry.md': '@./guide\n', 'guide.md': '# g\n' });
    assert.match(issues[0].message, /Did you mean @\.\/guide\.md\?/);
  });

  it('reports broken imports in nested files', () => {
    const { issues } = analyze({ 'entry.md': '@./a.md\n', 'a.md': '@./gone.md\n' });
    assert.deepEqual(issues.map((i) => [i.code, i.file]), [['IMPORT_NOT_FOUND', 'a.md']]);
  });

  it('reports directory imports', () => {
    assert.deepEqual(analyze({ 'entry.md': '@./security/\n', 'security/a.md': '# a\n' }).codes, ['IMPORT_IS_DIRECTORY']);
  });

  it('reports missing technology profiles distinctly', () => {
    assert.deepEqual(analyze({ 'entry.md': '@./profiles/vue.md\n', 'profiles/react.md': '# r\n' }).codes, ['IMPORT_MISSING_PROFILE']);
  });

  it('reports imports that escape the root', () => {
    assert.deepEqual(analyze({ 'sub/entry.md': '@../../outside.md\n' }, 'sub/entry.md').codes, ['IMPORT_OUTSIDE_ROOT']);
    assert.deepEqual(analyze({ 'entry.md': '@~/notes.md\n' }).codes, ['IMPORT_OUTSIDE_ROOT']);
  });

  it('warns on absolute paths inside the root', () => {
    const root = tempDir();
    writeFiles(root, { 'a.md': '# a\n' });
    writeFiles(root, { 'entry.md': `@${path.join(root, 'a.md').split(path.sep).join('/')}\n` });
    const { issues } = analyzeImports({ root, entries: [path.join(root, 'entry.md')] });
    assert.deepEqual(issues.map((i) => i.code), ['IMPORT_ABSOLUTE_PATH']);
  });

  it('detects circular imports once, with the cycle path', () => {
    const { issues } = analyze({ 'entry.md': '@./a.md\n', 'a.md': '@./b.md\n', 'b.md': '@./a.md\n' });
    assert.deepEqual(issues.map((i) => i.code), ['IMPORT_CIRCULAR']);
    assert.match(issues[0].message, /a\.md -> b\.md -> a\.md/);
  });

  it('detects self-imports as circular', () => {
    assert.deepEqual(analyze({ 'entry.md': '@./entry.md\n' }).codes, ['IMPORT_CIRCULAR']);
  });

  it('does not report a shared dependency (diamond) as circular', () => {
    const { issues } = analyze({ 'entry.md': '@./a.md\n@./b.md\n', 'a.md': '@./c.md\n', 'b.md': '@./c.md\n', 'c.md': '# c\n' });
    assert.deepEqual(issues, []);
  });

  it('warns on duplicate imports in one file', () => {
    assert.deepEqual(analyze({ 'entry.md': '@./a.md\n@./a.md\n', 'a.md': '# a\n' }).codes, ['IMPORT_DUPLICATE']);
  });

  it('warns when the chain exceeds the maximum depth', () => {
    const files = { 'entry.md': '@./1.md\n' };
    for (let i = 1; i <= 6; i += 1) files[`${i}.md`] = i < 6 ? `@./${i + 1}.md\n` : '# end\n';
    const { issues } = analyze(files, 'entry.md', { maxDepth: 5 });
    assert.deepEqual(issues.map((i) => [i.code, i.file]), [['IMPORT_DEPTH_EXCEEDED', 'entry.md']]);
  });

  it('rejects sensitive files without reading them', () => {
    const root = tempDir();
    writeFiles(root, { 'entry.md': '@./.env\n@./config/.env.local\n@./.env.example\n', '.env': 'TOKEN=abc\n', 'config/.env.local': 'X=1\n', '.env.example': 'TOKEN=\n' });
    const spy = mock.method(fs, 'readFileSync');
    try {
      const { issues } = analyzeImports({ root, entries: [path.join(root, 'entry.md')] });
      assert.deepEqual(issues.map((i) => i.code), ['IMPORT_SENSITIVE_FILE', 'IMPORT_SENSITIVE_FILE']);
      const read = spy.mock.calls.map((c) => String(c.arguments[0]));
      assert.ok(read.some((p) => p.endsWith('entry.md')), 'spy must observe file reads');
      assert.ok(!read.some((p) => /\.env(\.local)?$/.test(p)), `sensitive file was read: ${read.join(', ')}`);
    } finally {
      spy.mock.restore();
    }
  });

  it('checks non-Markdown imports for existence without following them', () => {
    const { issues, graph } = analyze({ 'entry.md': '@./data/config.yaml\n', 'data/config.yaml': '@./nope.md\n' });
    assert.deepEqual(issues, []);
    assert.ok(!graph.has('data/config.yaml'));
  });

  it('detects letter-case mismatches (case-insensitive FS) or missing files (case-sensitive FS)', () => {
    const { codes } = analyze({ 'entry.md': '@./guide.md\n', 'Guide.md': '# g\n' });
    assert.equal(codes.length, 1);
    assert.ok(['IMPORT_CASE_MISMATCH', 'IMPORT_NOT_FOUND'].includes(codes[0]), codes[0]);
  });

  it('maps consumer mount paths for template files', () => {
    const root = tempDir();
    writeFiles(root, { 'ENTRY.md': '# e\n', 'ai-instructions/CLAUDE.md': '@.engineering/standards/ENTRY.md\n@.engineering/standards/nope.md\n' });
    const { issues } = analyzeImports({
      root,
      entries: [path.join(root, 'ai-instructions/CLAUDE.md')],
      templateFiles: { 'ai-instructions/CLAUDE.md': { mountPath: '.engineering/standards' } },
    });
    assert.deepEqual(issues.map((i) => i.code), ['IMPORT_NOT_FOUND']);
    assert.match(issues[0].message, /resolved to nope\.md/);
  });

  it('ignores imports that only appear inside code', () => {
    assert.deepEqual(analyze({ 'entry.md': '```\n@./missing.md\n```\n`@./also-missing.md`\n' }).issues, []);
  });
});

describe('resolveImport', () => {
  it('resolves relative to the importing file', () => {
    const { abs, kind } = resolveImport(path.resolve('/r/profiles/x.md'), '../core/a.md', { root: path.resolve('/r') });
    assert.equal(abs, path.resolve('/r/core/a.md'));
    assert.equal(kind, 'relative');
  });
});

describe('isSensitivePath', () => {
  for (const p of ['.env', '.env.production', 'certs/server.key', 'id_rsa', '.npmrc', 'x.pem']) it(`flags ${p}`, () => assert.equal(isSensitivePath(p), true));
  for (const p of ['.env.example', 'environment.md', 'keys.md', 'server.key.example']) it(`allows ${p}`, () => assert.equal(isSensitivePath(p), false));
});
