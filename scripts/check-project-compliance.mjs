#!/usr/bin/env node
/**
 * Lightweight NSES adoption checker. This is not a security scanner or a proof of compliance.
 * Run from a project root: node .engineering/standards/scripts/check-project-compliance.mjs --report
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportOnly = process.argv.includes('--report');
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => exists(p) ? fs.readFileSync(path.join(root, p), 'utf8') : '';
const findings = [];
const add = (level, id, message) => findings.push({ level, id, message });

if (!exists('package.json')) add('INFO', 'NSES-001', 'No package.json found; this may not be a Node.js project.');
else {
  const pkg = JSON.parse(read('package.json'));
  const scripts = pkg.scripts ?? {};
  for (const name of ['lint', 'typecheck', 'test', 'build']) {
    if (!scripts[name]) add('WARN', `NSES-010-${name}`, `package.json has no '${name}' script.`);
  }
  if (!exists('package-lock.json') && !exists('pnpm-lock.yaml') && !exists('yarn.lock') && !exists('bun.lockb') && !exists('bun.lock')) {
    add('WARN', 'NSES-011', 'No recognized lockfile found. Commit the lockfile for the selected package manager.');
  }
}

const tsconfig = read('tsconfig.json');
if (!tsconfig) add('WARN', 'NSES-020', 'No tsconfig.json found.');
else if (!/"strict"\s*:\s*true/.test(tsconfig)) add('WARN', 'NSES-021', 'TypeScript strict mode is not explicitly enabled. Plan a safe migration if legacy constraints exist.');

if (!exists('AGENTS.md') && !exists('CLAUDE.md')) add('WARN', 'NSES-030', 'No root AGENTS.md or CLAUDE.md agent instructions found.');
if (!exists('.gitignore')) add('WARN', 'NSES-040', 'No .gitignore found.');
else {
  const gi = read('.gitignore');
  if (!/(^|\n)\.env\*?(\/|\s|$)/m.test(gi) && !gi.includes('.env')) add('WARN', 'NSES-041', '.gitignore does not appear to ignore environment files. Review manually; allow safe .env.example files.');
}

if (!exists('.github/workflows') && !exists('.gitlab-ci.yml') && !exists('azure-pipelines.yml')) add('WARN', 'NSES-050', 'No common CI configuration detected.');

console.log(`NSES baseline check — ${findings.length} finding(s)`);
for (const f of findings) console.log(`[${f.level}] ${f.id}: ${f.message}`);
console.log('\nThis report is a starter adoption check only. It does not inspect source code, prove authorization, detect vulnerabilities or replace security review.');
const blocking = findings.some((f) => f.level === 'ERROR');
if (blocking && !reportOnly) process.exit(1);
