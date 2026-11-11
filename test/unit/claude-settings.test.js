import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { NSES_ROOT } from '../../scripts/lib/files.js';

// shortcut: path.matchesGlob approximates Claude Code's gitignore-style matcher; enough to catch a
// pattern that would block the placeholder examples or miss a common secret file name.
const deny = JSON.parse(fs.readFileSync(path.join(NSES_ROOT, 'ai-instructions/claude-settings.json'), 'utf8'))
  .permissions.deny.map((r) => r.match(/^Read\((\*\*\/.+)\)$/)?.[1])
  .filter(Boolean);
const blocked = (file) => deny.some((g) => path.posix.matchesGlob(`app/${file}`, g));

describe('ai-instructions/claude-settings.json', () => {
  it('blocks common secret files', () => {
    for (const f of ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.prod', '.env.staging', '.env.test', '.env.keys', '.env.production.bak', 'production.env', '.envrc', 'server.pem', 'tls.key', '.npmrc', 'credentials.json', 'secrets/db.json']) {
      assert.ok(blocked(f), `${f} should be blocked`);
    }
  });

  it('allows placeholder example files', () => {
    for (const f of ['.env.example', '.env.sample', '.env.template', '.env.local.example', '.env.production.example']) {
      assert.ok(!blocked(f), `${f} should be readable`);
    }
  });
});
