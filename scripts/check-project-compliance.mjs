#!/usr/bin/env node
/**
 * Backward-compatible entry point (NSES <= 1.1.0 documented this path).
 * The checker now lives in check-project-compliance.js; prefer that path in new CI configuration.
 */
import { USAGE, main } from './check-project-compliance.js';
import { runCli } from './lib/files.js';

runCli(main, USAGE);
