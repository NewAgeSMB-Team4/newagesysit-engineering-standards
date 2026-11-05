import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it, mock } from 'node:test';
import { checkProject } from '../../scripts/check-project-compliance.js';
import { cleanup, codes, createProject, failCodes, runJson, runScript, snapshot, tempDir, writeFiles } from '../helpers.js';

after(cleanup);

describe('check-project-compliance: correctly integrated projects', () => {
  for (const stack of ['nextjs', 'nestjs', 'react']) {
    it(`${stack}: passes with no failures`, () => {
      const project = createProject(stack);
      const { status, json } = runJson('check-project-compliance.js', [project]);
      assert.equal(status, 0, JSON.stringify(json.results.filter((r) => r.level === 'FAIL'), null, 2));
      const passed = json.results.filter((r) => r.level === 'PASS').map((r) => r.code);
      for (const code of ['NSES_SUBMODULE', 'NSES_VERSION', 'CLAUDE_ENTRY_IMPORT', 'CLAUDE_PROFILE_IMPORT', 'CLAUDE_IMPORTS_RESOLVE', 'AGENTS_ENTRY_REFERENCE', 'PROFILE_MATCHES_STACK', 'TOOLING_TS_STRICT']) {
        assert.ok(passed.includes(code), `${code} should pass`);
      }
      assert.ok(json.results.some((r) => r.code === 'STACK_DETECTED' && r.message.includes({ nextjs: 'Next.js', nestjs: 'NestJS', react: 'React' }[stack])));
    });
  }

  it('does not detect React as a separate stack in a Next.js project', () => {
    const report = checkProject({ projectRoot: createProject('nextjs') });
    const detected = report.results.filter((r) => r.code === 'STACK_DETECTED');
    assert.equal(detected.length, 1);
  });

  it('defaults to the current directory', () => {
    const project = createProject('react');
    assert.equal(runScript('check-project-compliance.js', [], { cwd: project }).status, 0);
  });

  it('still works through the legacy .mjs entry point', () => {
    const project = createProject('react');
    const { status, stdout } = runScript('check-project-compliance.mjs', [project]);
    assert.equal(status, 0);
    assert.match(stdout, /NSES project integration check/);
  });
});

describe('check-project-compliance: integration problems', () => {
  it('fails when NSES is missing entirely', () => {
    const project = createProject('nextjs', { withNses: false, submodule: false });
    const { status, json } = runJson('check-project-compliance.js', [project]);
    assert.equal(status, 1);
    assert.ok(json.results.some((r) => r.code === 'NSES_NOT_FOUND'));
  });

  it('reports an uninitialised submodule', () => {
    const project = createProject('nestjs', { withNses: false });
    assert.ok(failCodes(checkProject({ projectRoot: project })).includes('NSES_NOT_INITIALIZED'));
  });

  it('warns about a vendored copy that is not a submodule', () => {
    const report = checkProject({ projectRoot: createProject('react', { submodule: false }) });
    assert.ok(codes(report).includes('NSES_NOT_SUBMODULE'));
  });

  it('--report never fails the run', () => {
    const project = createProject('nextjs', { withNses: false, submodule: false });
    assert.equal(runScript('check-project-compliance.js', [project, '--report']).status, 0);
  });

  it('detects missing ENTRY.md import and missing profile import in CLAUDE.md', () => {
    const project = createProject('nestjs', { files: { 'CLAUDE.md': '# Project\n\nNo imports.\n' } });
    const fails = failCodes(checkProject({ projectRoot: project }));
    assert.ok(fails.includes('CLAUDE_ENTRY_IMPORT_MISSING'));
    assert.ok(fails.includes('CLAUDE_PROFILE_IMPORT_MISSING'));
  });

  it('detects a profile that does not match the stack', () => {
    const project = createProject('nestjs', {
      files: {
        'CLAUDE.md': '# P\n\n@.engineering/standards/ENTRY.md\n@.engineering/standards/profiles/nextjs.md\n',
        'AGENTS.md': '# A\n\nRead `.engineering/standards/ENTRY.md` and `.engineering/standards/profiles/nextjs.md`.\n',
      },
    });
    const report = checkProject({ projectRoot: project });
    assert.ok(failCodes(report).includes('PROFILE_NOT_CONFIGURED'));
    assert.ok(codes(report).includes('PROFILE_STACK_MISMATCH'));
  });

  it('detects broken and unsafe imports in CLAUDE.md, including nested ones', () => {
    const project = createProject('react', {
      files: {
        'CLAUDE.md': '# P\n\n@.engineering/standards/ENTRY.md\n@.engineering/standards/profiles/react.md\n@.engineering/standards/profiles/vue.md\n@./docs/arch.md\n@./.env\n',
        'docs/arch.md': '# Arch\n\n@./missing-adr.md\n',
        '.env': 'SECRET_TOKEN=do-not-print-1234\n',
      },
    });
    const fails = failCodes(checkProject({ projectRoot: project }));
    assert.ok(fails.includes('IMPORT_MISSING_PROFILE'));
    assert.ok(fails.includes('IMPORT_NOT_FOUND'));
    assert.ok(fails.includes('IMPORT_SENSITIVE_FILE'));
  });

  it('detects broken references in AGENTS.md', () => {
    const project = createProject('react', { files: { 'AGENTS.md': '# A\n\nRead `.engineering/standards/ENTRY.md` and `.engineering/standards/profiles/reakt.md`.\n' } });
    assert.ok(failCodes(checkProject({ projectRoot: project })).includes('AGENTS_BROKEN_REFERENCE'));
  });

  it('fails when neither CLAUDE.md nor AGENTS.md exists', () => {
    const project = createProject('react');
    fs.rmSync(path.join(project, 'CLAUDE.md'));
    fs.rmSync(path.join(project, 'AGENTS.md'));
    const fails = failCodes(checkProject({ projectRoot: project }));
    assert.ok(fails.includes('CLAUDE_MD_MISSING') && fails.includes('AGENTS_MD_MISSING'));
  });

  it('warns when the CLAUDE.md template was copied without customisation', () => {
    const project = createProject('nextjs');
    fs.copyFileSync(path.join(project, '.engineering/standards/ai-instructions/CLAUDE.md'), path.join(project, 'CLAUDE.md'));
    assert.ok(codes(checkProject({ projectRoot: project })).includes('CLAUDE_TEMPLATE_NOT_CUSTOMIZED'));
  });

  it('reports missing recommended tooling as warnings, not failures', () => {
    const project = createProject('nestjs');
    for (const f of ['eslint.config.mjs', '.prettierrc.json', 'package-lock.json', '.github']) fs.rmSync(path.join(project, f), { recursive: true });
    writeFiles(project, { 'tsconfig.json': '{ "compilerOptions": {} }\n', 'package.json': JSON.stringify({ dependencies: { '@nestjs/core': '11.0.0' }, devDependencies: { typescript: '5.9.0' } }) });
    const report = checkProject({ projectRoot: project });
    const warnings = report.results.filter((r) => r.level === 'WARNING').map((r) => r.code);
    for (const code of ['TOOLING_ESLINT_MISSING', 'TOOLING_PRETTIER_MISSING', 'TOOLING_LOCKFILE_MISSING', 'TOOLING_CI_MISSING', 'TOOLING_TS_STRICT_MISSING', 'TOOLING_SCRIPT_MISSING', 'TOOLING_TEST_FRAMEWORK_MISSING']) {
      assert.ok(warnings.includes(code), code);
    }
    assert.ok(!failCodes(report).some((c) => c.startsWith('TOOLING_')));
  });

  it('honours --standards-path for a custom mount location', () => {
    const project = createProject('react', { withNses: false, submodule: false });
    fs.cpSync(path.join(createProject('react'), '.engineering/standards'), path.join(project, 'vendor/nses'), { recursive: true });
    writeFiles(project, {
      '.gitmodules': '[submodule "nses"]\n\tpath = vendor/nses\n\turl = https://github.com/NewAgeSMB-Team4/newagesysit-engineering-standards.git\n',
      'CLAUDE.md': '# P\n\n@vendor/nses/ENTRY.md\n@vendor/nses/profiles/react.md\n',
      'AGENTS.md': '# A\n\nRead `vendor/nses/ENTRY.md` and `vendor/nses/profiles/react.md`.\n',
    });
    assert.equal(runScript('check-project-compliance.js', [project]).status, 0, 'auto-detected from .gitmodules');
    assert.equal(runScript('check-project-compliance.js', [project, '--standards-path', 'vendor/nses']).status, 0);
  });

  it('returns exit code 2 for a missing project directory', () => {
    assert.equal(runScript('check-project-compliance.js', [path.join(tempDir(), 'nope')]).status, 2);
  });
});

describe('check-project-compliance: safety guarantees', () => {
  const secret = 'SECRET_TOKEN=do-not-print-1234';

  it('does not modify the target project', () => {
    const project = createProject('nextjs', { files: { '.env': `${secret}\n` } });
    const before = snapshot(project);
    runScript('check-project-compliance.js', [project, '--json']);
    runScript('check-project-compliance.js', [project, '--verbose']);
    assert.equal(snapshot(project), before);
  });

  it('never reads .env or credential files', () => {
    const project = createProject('nextjs', {
      files: { '.env': `${secret}\n`, '.env.local': `${secret}\n`, '.npmrc': '//registry.npmjs.org/:_authToken=npm_SECRET\n', 'CLAUDE.md': '# P\n\n@.engineering/standards/ENTRY.md\n@.engineering/standards/profiles/nextjs.md\n@./.env\n' },
    });
    const spy = mock.method(fs, 'readFileSync');
    try {
      checkProject({ projectRoot: project });
      const read = spy.mock.calls.map((c) => path.basename(String(c.arguments[0])));
      assert.ok(read.includes('package.json'), 'spy must observe reads');
      assert.ok(!read.some((f) => f.startsWith('.env') || f === '.npmrc'), `read sensitive file: ${read.filter((f) => f.startsWith('.'))}`);
    } finally {
      spy.mock.restore();
    }
  });

  it('never prints secrets, including credentials embedded in submodule URLs', () => {
    const project = createProject('nextjs', {
      files: {
        '.env': `${secret}\n`,
        '.gitmodules': '[submodule "s"]\n\tpath = .engineering/standards\n\turl = https://ci-user:ghp_SUPERSECRET@github.com/NewAgeSMB-Team4/newagesysit-engineering-standards.git\n',
      },
    });
    for (const args of [[project], [project, '--json'], [project, '--verbose']]) {
      const { stdout, stderr } = runScript('check-project-compliance.js', args);
      for (const leaked of ['do-not-print-1234', 'ghp_SUPERSECRET', 'ci-user']) assert.ok(!`${stdout}${stderr}`.includes(leaked), `leaked ${leaked}`);
    }
  });

  it('states that it is a configuration check, not a security audit', () => {
    const { stdout } = runScript('check-project-compliance.js', [createProject('react')]);
    assert.match(stdout, /configuration check/i);
    assert.match(stdout, /not a security sign-off/i);
  });

  it('does not execute project scripts', () => {
    const marker = path.join(tempDir(), 'executed');
    const project = createProject('react', {
      files: { 'package.json': JSON.stringify({ dependencies: { react: '19.0.0' }, scripts: { lint: `node -e "require('fs').writeFileSync('${marker.replace(/\\/g, '/')}','x')"`, prepare: 'exit 1' } }) },
    });
    runScript('check-project-compliance.js', [project]);
    assert.equal(fs.existsSync(marker), false);
  });
});
