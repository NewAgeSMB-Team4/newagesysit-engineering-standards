import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { validateStandards } from '../../scripts/validate-standards.js';
import { cleanup, copyNses, failCodes, runJson, runScript, tempDir, writeFiles } from '../helpers.js';

after(cleanup);

/** Copy NSES, apply a mutation, and return the validation report. */
function validateMutated(mutate) {
  const root = copyNses(tempDir());
  mutate(root);
  return validateStandards({ root });
}

const replaceIn = (root, file, from, to) => {
  const abs = path.join(root, file);
  // Normalise to LF first so string patterns containing '\n' match on CRLF checkouts too.
  fs.writeFileSync(abs, fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n').replace(from, to));
};

describe('validate-standards on the NSES repository', () => {
  it('passes with no failures', () => {
    const { status, json } = runJson('validate-standards.js');
    assert.equal(status, 0, JSON.stringify(json.results.filter((r) => r.level !== 'PASS' && r.level !== 'INFO'), null, 2));
    assert.equal(json.summary.FAIL, 0);
  });

  it('reports explained cross-framework imports as INFO', () => {
    const { json } = runJson('validate-standards.js');
    assert.ok(json.results.some((r) => r.code === 'PROFILE_CROSS_FRAMEWORK_ALLOWED' && r.level === 'INFO'));
  });

  it('prints PASS lines with --verbose', () => {
    assert.match(runScript('validate-standards.js', ['--verbose']).stdout, /\[PASS\] VERSION_VALID/);
  });
});

describe('validate-standards detects regressions', () => {
  it('missing ENTRY.md', () => {
    const r = validateMutated((root) => fs.rmSync(path.join(root, 'ENTRY.md')));
    assert.ok(failCodes(r).includes('STRUCTURE_FILE_MISSING'));
    assert.ok(r.failed);
  });

  it('invalid VERSION', () => {
    assert.ok(failCodes(validateMutated((root) => writeFiles(root, { VERSION: 'v1.2\n' }))).includes('VERSION_INVALID'));
  });

  it('README version out of sync', () => {
    assert.ok(failCodes(validateMutated((root) => replaceIn(root, 'README.md', /\*\*Version:\*\* [^\s]+/, '**Version:** 9.9.9'))).includes('VERSION_MISMATCH'));
  });

  it('CHANGELOG without an entry for the current version', () => {
    assert.ok(failCodes(validateMutated((root) => writeFiles(root, { 'CHANGELOG.md': '# Changelog\n' }))).includes('CHANGELOG_ENTRY_MISSING'));
  });

  it('missing supported profile', () => {
    assert.ok(failCodes(validateMutated((root) => fs.rmSync(path.join(root, 'profiles/nestjs.md')))).includes('PROFILE_MISSING'));
  });

  it('profile not referenced from ENTRY.md', () => {
    assert.ok(failCodes(validateMutated((root) => replaceIn(root, 'ENTRY.md', /profiles\/react\.md/g, 'profiles/REMOVED'))).includes('PROFILE_NOT_IN_ENTRY'));
  });

  it('profile missing a required baseline import', () => {
    const r = validateMutated((root) => replaceIn(root, 'profiles/react.md', '@../security/input-validation.md\n', ''));
    assert.ok(failCodes(r).includes('PROFILE_REQUIRED_IMPORT_MISSING'));
  });

  it('profile importing another framework without explanation', () => {
    const r = validateMutated((root) => replaceIn(root, 'profiles/react.md', '## Quality standards', '@../frameworks/nestjs/security.md\n\n## Quality standards'));
    assert.ok(failCodes(r).includes('PROFILE_CONFLICTING_IMPORT'));
  });

  it('profile importing another profile', () => {
    const r = validateMutated((root) => replaceIn(root, 'profiles/nextjs.md', '## Quality standards', '@./react.md\n\n## Quality standards'));
    assert.ok(failCodes(r).includes('PROFILE_IMPORTS_PROFILE'));
  });

  it('undeclared profile file is a warning', () => {
    const r = validateMutated((root) => writeFiles(root, { 'profiles/vue.md': '# Vue\n\n@../core/clean-code.md\n' }));
    assert.ok(r.results.some((x) => x.code === 'PROFILE_NOT_IN_MANIFEST' && x.level === 'WARNING'));
    assert.equal(r.failed, false);
  });

  it('missing required security standard', () => {
    assert.ok(failCodes(validateMutated((root) => fs.rmSync(path.join(root, 'security/data-protection.md')))).includes('STANDARD_MISSING'));
  });

  it('CLAUDE.md template without the ENTRY.md import', () => {
    const r = validateMutated((root) => replaceIn(root, 'ai-instructions/CLAUDE.md', '@.engineering/standards/ENTRY.md', 'ENTRY'));
    assert.ok(failCodes(r).includes('TEMPLATE_CLAUDE_ENTRY_MISSING'));
  });

  it('broken documentation reference', () => {
    const r = validateMutated((root) => replaceIn(root, 'README.md', /$/, '\nSee `adoption/missing-guide.md`.\n'));
    assert.ok(failCodes(r).includes('DOC_REFERENCE_NOT_FOUND'));
  });

  it('broken nested import', () => {
    const r = validateMutated((root) => replaceIn(root, 'frameworks/react/instructions.md', /$/, '\n@./nope.md\n'));
    assert.ok(failCodes(r).includes('IMPORT_NOT_FOUND'));
  });

  it('invalid manifest', () => {
    assert.ok(failCodes(validateMutated((root) => writeFiles(root, { 'standards.manifest.json': '{' }))).includes('MANIFEST_INVALID'));
  });

  it('exits 1 from the CLI when a mandatory check fails', () => {
    const root = copyNses(tempDir());
    writeFiles(root, { VERSION: 'bad\n' });
    assert.equal(runScript('validate-standards.js', ['--root', root]).status, 1);
  });
});

describe('lint-repo', () => {
  it('passes on the NSES repository', () => {
    const { status, json } = runJson('lint-repo.js');
    assert.equal(status, 0, JSON.stringify(json.results.filter((r) => r.level === 'FAIL'), null, 2));
  });

  it('detects unclosed fences, bad JSON, YAML tabs and syntax errors', () => {
    const root = copyNses(tempDir());
    writeFiles(root, {
      'core/broken.md': '# B\n\n```\n@../hidden.md\n',
      'tooling/bad.json': '{ nope }\n',
      'tooling/bad.yml': 'a:\n\tb: 1\n',
      'scripts/bad.js': 'const = 1;\n',
    });
    const { status, json } = runJson('lint-repo.js', ['--root', root]);
    assert.equal(status, 1);
    const found = new Set(json.results.map((r) => r.code));
    for (const code of ['MD_UNCLOSED_FENCE', 'JSON_INVALID', 'YAML_TAB_INDENT', 'JS_SYNTAX']) assert.ok(found.has(code), code);
  });
});
