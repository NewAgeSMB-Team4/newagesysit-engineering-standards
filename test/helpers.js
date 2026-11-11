/** Shared helpers for NSES script tests. Fixtures are created in OS temp directories. */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NSES_ROOT } from '../scripts/lib/files.js';

export { NSES_ROOT };

const created = [];

export function tempDir(prefix = 'nses-test-') {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  created.push(dir);
  return dir;
}

export function cleanup() {
  while (created.length) fs.rmSync(created.pop(), { recursive: true, force: true });
}

/** Write a map of { 'relative/path': content } under root. A null content creates a directory. */
export function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    if (content === null) {
      fs.mkdirSync(abs, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return root;
}

/** Copy the NSES repository (without .git, node_modules and tests) to dest. */
export function copyNses(dest) {
  const skip = new Set(['.git', 'node_modules', 'test', 'coverage']);
  fs.cpSync(NSES_ROOT, dest, {
    recursive: true,
    filter: (src) => {
      const r = path.relative(NSES_ROOT, src);
      return !r || !skip.has(r.split(path.sep)[0]);
    },
  });
  return dest;
}

/** Run a script from scripts/ with Node and return { status, stdout, stderr }. */
export function runScript(script, args = [], options = {}) {
  const res = spawnSync(process.execPath, [path.join(NSES_ROOT, 'scripts', script), ...args], {
    encoding: 'utf8',
    cwd: options.cwd ?? NSES_ROOT,
  });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
}

export function runJson(script, args = [], options = {}) {
  const res = runScript(script, [...args, '--json'], options);
  return { ...res, json: JSON.parse(res.stdout) };
}

export const codes = (report) => (report.results ?? report.toJSON().results).map((r) => r.code);
export const failCodes = (report) => (report.results ?? report.toJSON().results).filter((r) => r.level === 'FAIL').map((r) => r.code);

/** Hash every file (path, size, content) under a directory, to prove a tool did not modify it. */
export function snapshot(root) {
  const hash = crypto.createHash('sha256');
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const abs = path.join(dir, entry.name);
      hash.update(path.relative(root, abs));
      if (entry.isDirectory()) walk(abs);
      else hash.update(fs.readFileSync(abs));
    }
  };
  walk(root);
  return hash.digest('hex');
}

/**
 * Create a consuming project with NSES mounted at .engineering/standards.
 * @param {'nextjs'|'nestjs'|'react'} stack
 * @param {{ files?: object, withNses?: boolean, submodule?: boolean }} options
 */
export function createProject(stack, { files = {}, withNses = true, submodule = true } = {}) {
  const root = tempDir(`nses-project-${stack}-`);
  const deps = {
    nextjs: { dependencies: { next: '16.0.0', react: '19.2.0', 'react-dom': '19.2.0' }, devDependencies: { typescript: '5.9.0', vitest: '4.0.0' } },
    nestjs: { dependencies: { '@nestjs/core': '11.1.0', '@nestjs/common': '11.1.0' }, devDependencies: { typescript: '5.9.0', jest: '30.0.0', '@nestjs/testing': '11.1.0' } },
    react: { dependencies: { react: '19.2.0', 'react-dom': '19.2.0' }, devDependencies: { typescript: '5.9.0', vite: '7.0.0', vitest: '4.0.0' } },
  }[stack];
  const mount = '.engineering/standards';
  writeFiles(root, {
    'package.json': JSON.stringify({ name: `fixture-${stack}`, private: true, scripts: { lint: 'eslint .', typecheck: 'tsc --noEmit', test: 'vitest', build: 'build' }, ...deps }, null, 2),
    'package-lock.json': '{}\n',
    'tsconfig.json': '{\n  // strict for NSES\n  "compilerOptions": { "strict": true }\n}\n',
    'eslint.config.mjs': 'export default [];\n',
    '.prettierrc.json': '{}\n',
    '.gitignore': 'node_modules/\n.env\n.env.*\n!.env.example\n',
    '.github/workflows/ci.yml': 'name: CI\non: [push]\njobs: {}\n',
    '.claude/settings.json': '{ "permissions": { "deny": ["Read(**/.env)", "Read(**/.env.*)"] } }\n',
    'CLAUDE.md': `# Project\n\n@${mount}/ENTRY.md\n@${mount}/profiles/${stack}.md\n`,
    'AGENTS.md': `# Agents\n\nRead \`${mount}/ENTRY.md\` and \`${mount}/profiles/${stack}.md\`.\n`,
    ...(submodule ? { '.gitmodules': `[submodule "${mount}"]\n\tpath = ${mount}\n\turl = https://github.com/NewAgeSMB-Team4/newagesysit-engineering-standards.git\n` } : {}),
  });
  if (withNses) copyNses(path.join(root, mount));
  writeFiles(root, files);
  return root;
}
