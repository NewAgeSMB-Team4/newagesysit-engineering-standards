import assert from 'node:assert/strict';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { UsageError, caseMismatch, isInside, parseArgs } from '../../scripts/lib/files.js';
import { Report, formatText } from '../../scripts/lib/report.js';
import { SEMVER, compareSemver } from '../../scripts/lib/semver.js';
import { parseGitmodules, readSubmodulePin, redactUrl } from '../../scripts/check-project-compliance.js';
import { cleanup, tempDir, writeFiles } from '../helpers.js';

after(cleanup);

describe('Report', () => {
  it('counts levels and fails only on FAIL', () => {
    const r = new Report('t').pass('A', 'a').warn('B', 'b').info('C', 'c');
    assert.equal(r.failed, false);
    r.fail('D', 'd');
    assert.equal(r.failed, true);
    assert.deepEqual(r.counts(), { PASS: 1, INFO: 1, WARNING: 1, FAIL: 1 });
  });

  it('hides PASS lines unless verbose and prints a result line', () => {
    const r = new Report('t').pass('OK', 'fine').fail('BAD', 'broken', { file: 'x.md', line: 3 });
    const text = formatText(r);
    assert.match(text, /\[FAIL\] BAD: broken \(x\.md:3\)/);
    assert.doesNotMatch(text, /\[PASS\]/);
    assert.match(formatText(r, { verbose: true }), /\[PASS\] OK: fine/);
    assert.match(text, /Result: FAIL/);
  });

  it('rejects unknown levels', () => {
    assert.throws(() => new Report('t').add('ERROR', 'X', 'y'));
  });
});

describe('semver', () => {
  for (const v of ['1.2.0', '0.0.1', '10.20.30', '1.0.0-rc.1', '1.0.0+build.5']) it(`accepts ${v}`, () => assert.ok(SEMVER.test(v)));
  for (const v of ['1.2', 'v1.2.0', '01.2.0', '1.2.0 ', '1.2.x']) it(`rejects '${v}'`, () => assert.ok(!SEMVER.test(v)));
  it('compares versions numerically', () => {
    assert.ok(compareSemver('1.10.0', '1.9.0') > 0);
    assert.equal(compareSemver('1.2.0', '1.2.0-rc.1'), 0);
    assert.ok(compareSemver('1.0.9', '1.1.0') < 0);
  });
});

describe('parseArgs', () => {
  it('parses flags, values and positionals', () => {
    const { flags, positionals } = parseArgs(['p', '--profile', 'nextjs', '--json', '--root=/x'], { booleans: ['json'], strings: ['profile', 'root'] });
    assert.deepEqual(flags, { profile: 'nextjs', json: true, root: '/x' });
    assert.deepEqual(positionals, ['p']);
  });
  it('throws UsageError for unknown options and missing values', () => {
    assert.throws(() => parseArgs(['--nope']), UsageError);
    assert.throws(() => parseArgs(['--profile'], { strings: ['profile'] }), UsageError);
    assert.throws(() => parseArgs(['--profile', '--json'], { booleans: ['json'], strings: ['profile'] }), UsageError);
  });
});

describe('path helpers', () => {
  it('isInside', () => {
    const root = path.resolve('/r');
    assert.ok(isInside(root, path.resolve('/r/a/b')));
    assert.ok(!isInside(root, path.resolve('/r2/a')));
    assert.ok(!isInside(root, path.resolve('/a')));
  });
  it('caseMismatch returns null when case matches', () => {
    const root = tempDir();
    writeFiles(root, { 'Dir/File.md': '#\n' });
    assert.equal(caseMismatch(root, path.join(root, 'Dir', 'File.md')), null);
  });
});

describe('compliance helpers', () => {
  it('parses .gitmodules', () => {
    const mods = parseGitmodules('[submodule "std"]\n\tpath = .engineering/standards\n\turl = git@github.com:o/r.git\n\tbranch = main\n');
    assert.deepEqual(mods, [{ name: 'std', path: '.engineering/standards', url: 'git@github.com:o/r.git', branch: 'main' }]);
  });

  it('redacts credentials and query strings from URLs', () => {
    assert.equal(redactUrl('https://user:tok3n@github.com/o/r.git'), 'https://github.com/o/r.git');
    assert.equal(redactUrl('https://x-access-token:abc@github.com/o/r.git?x=1'), 'https://github.com/o/r.git');
    assert.equal(redactUrl('git@github.com:o/r.git'), 'git@github.com:o/r.git');
  });

  it('reads the submodule pin from git metadata', () => {
    const root = tempDir();
    const sha = 'a'.repeat(40);
    writeFiles(root, {
      'project/.engineering/standards/.git': 'gitdir: ../../.git/modules/std\n',
      'project/.git/modules/std/HEAD': `${sha}\n`,
      'project/.git/modules/std/packed-refs': `# pack-refs\n${'b'.repeat(40)} refs/tags/v1.1.0\n^${sha}\n`,
    });
    assert.deepEqual(readSubmodulePin(path.join(root, 'project/.engineering/standards')), { kind: 'tag', value: 'v1.1.0' });

    writeFiles(root, { 'project/.git/modules/std/HEAD': 'ref: refs/heads/main\n' });
    assert.deepEqual(readSubmodulePin(path.join(root, 'project/.engineering/standards')), { kind: 'branch', value: 'main' });

    writeFiles(root, { 'project/.git/modules/std/HEAD': `${'c'.repeat(40)}\n` });
    assert.deepEqual(readSubmodulePin(path.join(root, 'project/.engineering/standards')), { kind: 'commit', value: 'c'.repeat(12) });
  });

  it('returns unknown without git metadata', () => {
    assert.deepEqual(readSubmodulePin(tempDir()), { kind: 'unknown' });
  });
});
