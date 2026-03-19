import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');
const portsConfigPath = resolve(projectRoot, 'config/ports.json');
const portsConfig = JSON.parse(readFileSync(portsConfigPath, 'utf8'));
const frontendPort = Number(process.env.FRONTEND_PORT) || Number(portsConfig.frontend);
const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${frontendPort}`;

function runAgentBrowser(args) {
  return execFileSync(
    'node',
    ['tools/agent-browser/bin/agent-browser.js', ...args],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  ).trim();
}

test('opens homepage and validates page access', async () => {
  try {
    runAgentBrowser(['open', frontendUrl]);

    const titleOutput = runAgentBrowser(['get', 'title']);
    assert.match(
      titleOutput,
      /Townhall Q&A Poll/i,
      `Expected app title in output, got: ${titleOutput}`
    );

    runAgentBrowser(['snapshot', '-i']);
  } finally {
    // Keep cleanup deterministic even if assertions fail.
    runAgentBrowser(['close']);
  }
});
