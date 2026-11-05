import assert from 'node:assert/strict';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { cleanup, copyNses, runJson, runScript, tempDir, writeFiles } from '../helpers.js';

after(cleanup);

describe('validate-imports CLI on the NSES repository', () => {
  it('passes for the whole repository', () => {
    const { status, json } = runJson('validate-imports.js');
    assert.equal(status, 0, JSON.stringify(json.results.filter((r) => r.level === 'FAIL'), null, 2));
    assert.equal(json.passed, true);
  });

  for (const profile of ['nextjs', 'nestjs', 'react']) {
    it(`passes for --profile ${profile}`, () => {
      const { status, json } = runJson('validate-imports.js', ['--profile', profile]);
      assert.equal(status, 0);
      assert.match(json.title, new RegExp(profile));
      assert.ok(json.results.some((r) => r.code === 'IMPORTS_OK' && r.file === `profiles/${profile}.md`));
    });
  }

  it('passes for --all-profiles', () => {
    assert.equal(runScript('validate-imports.js', ['--all-profiles']).status, 0);
  });

  it('fails for an unknown profile and lists supported ones', () => {
    const { status, stdout } = runScript('validate-imports.js', ['--profile', 'vue']);
    assert.equal(status, 1);
    assert.match(stdout, /IMPORT_MISSING_PROFILE/);
    assert.match(stdout, /nextjs, nestjs, react/);
  });

  it('validates a single file', () => {
    assert.equal(runScript('validate-imports.js', ['--file', 'profiles/react.md']).status, 0);
  });

  it('returns exit code 2 for usage errors', () => {
    assert.equal(runScript('validate-imports.js', ['--bogus']).status, 2);
    assert.equal(runScript('validate-imports.js', ['--file', 'does-not-exist.md']).status, 2);
    assert.equal(runScript('validate-imports.js', ['--profile', 'nextjs', '--all-profiles']).status, 2);
  });

  it('prints help', () => {
    const { status, stdout } = runScript('validate-imports.js', ['--help']);
    assert.equal(status, 0);
    assert.match(stdout, /--profile <name>/);
  });
});

describe('validate-imports CLI on a broken repository copy', () => {
  const root = copyNses(tempDir());
  writeFiles(root, {
    'profiles/nextjs.md': '# Next\n\n@../core/coding-principles.md\n@../core/does-not-exist.md\n@../security/\n@../../outside.md\n```\n@../ignored-in-code.md\n```\n',
    'core/loop-a.md': '# A\n@./loop-b.md\n',
    'core/loop-b.md': '# B\n@./loop-a.md\n',
  });

  it('reports each problem with file and line, and exits 1', () => {
    const { status, json } = runJson('validate-imports.js', ['--root', root, '--profile', 'nextjs']);
    assert.equal(status, 1);
    const fails = json.results.filter((r) => r.level === 'FAIL').map((r) => `${r.code}@${r.file}:${r.line}`);
    assert.deepEqual(fails.sort(), [
      'IMPORT_IS_DIRECTORY@profiles/nextjs.md:5',
      'IMPORT_NOT_FOUND@profiles/nextjs.md:4',
      'IMPORT_OUTSIDE_ROOT@profiles/nextjs.md:6',
    ]);
  });

  it('finds circular imports in a repository-wide scan', () => {
    const { status, json } = runJson('validate-imports.js', ['--root', root]);
    assert.equal(status, 1);
    assert.ok(json.results.some((r) => r.code === 'IMPORT_CIRCULAR' && /loop-a\.md -> core\/loop-b\.md|loop-b\.md -> core\/loop-a\.md/.test(r.message)));
  });

  it('validates a file outside the repository against the given root', () => {
    const file = path.join(root, 'core', 'loop-a.md');
    const { status } = runScript('validate-imports.js', ['--root', root, '--file', file]);
    assert.equal(status, 1);
  });
});
