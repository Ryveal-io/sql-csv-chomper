#!/usr/bin/env node
/**
 * Launcher for the SQL CSV Chomper MCP server.
 * Ensures the native `duckdb` package is installed before starting the server.
 * This is needed because `duckdb` contains platform-specific native bindings
 * that can't be bundled into a single JS file.
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function ensureDuckDb() {
  // Check if duckdb is already installed in our directory
  const nodeModules = join(__dirname, 'node_modules', 'duckdb');
  if (existsSync(nodeModules)) return;

  // Check if a package.json exists for npm install
  const pkgJson = join(__dirname, 'package.json');
  if (!existsSync(pkgJson)) {
    // This shouldn't happen if build copied it correctly
    process.stderr.write('[Chomper MCP] Error: package.json not found. Cannot install duckdb.\n');
    process.exit(1);
  }

  process.stderr.write('[Chomper MCP] Installing native duckdb module (first run only)...\n');
  try {
    execSync('npm install --production --no-package-lock', {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000,
    });
    process.stderr.write('[Chomper MCP] duckdb installed successfully.\n');
  } catch (err) {
    process.stderr.write(`[Chomper MCP] Failed to install duckdb: ${err.message}\n`);
    process.stderr.write('[Chomper MCP] Try running manually: cd "' + __dirname + '" && npm install\n');
    process.exit(1);
  }
}

ensureDuckDb();

// Now import and run the actual server
await import('./server.js');
