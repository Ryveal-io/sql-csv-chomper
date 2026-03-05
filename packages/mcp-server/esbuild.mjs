import * as esbuild from 'esbuild';
import { cpSync } from 'fs';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/server.ts'],
  bundle: true,
  outfile: 'out/server.js',
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  external: [
    'duckdb',
  ],
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching MCP server...');
} else {
  await esbuild.build(buildOptions);
  cpSync('src/cli.mjs', 'out/cli.mjs');
  console.log('MCP server built.');
}
