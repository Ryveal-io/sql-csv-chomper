# CLAUDE.md — Project Guide for AI Assistants

## What is this?

SQL CSV Chomper — a VS Code extension + standalone webapp + MCP server for querying and editing CSV/TSV files using SQL. Powered by DuckDB.

## Monorepo Structure

```
packages/
  extension/     # VS Code extension host (TypeScript, esbuild)
  webapp/        # React UI rendered inside VS Code webview (Vite, Monaco, TanStack Table, DuckDB WASM)
  mcp-server/    # MCP server for Claude/Copilot integration (DuckDB native via duckdb-async)
scripts/
  build.mjs      # Orchestrates full build: webapp → mcp-server → extension, then copies artifacts
```

### How the pieces connect

1. **Webapp** builds to `packages/webapp/dist/` → copied to `packages/extension/webview-dist/`
2. **MCP server** builds to `packages/mcp-server/out/` → copied to `packages/extension/out/mcp/`
3. **Extension** builds to `packages/extension/out/extension.js`
4. The extension opens CSV files using a custom editor provider that loads the webapp in a VS Code webview
5. The MCP server is published as `sql-csv-chomper-mcp` on npm — users run it via `npx -y sql-csv-chomper-mcp`. The extension also bundles a copy with a launcher for the Copilot MCP definition provider

### Key architecture decisions

- **Webapp uses DuckDB WASM** (runs in browser/webview) — no native deps needed for the editor
- **MCP server uses native DuckDB** (via `duckdb-async`) — faster for CLI/AI workflows, but needs platform-specific binaries
- **MCP distribution**: The npm package `sql-csv-chomper-mcp` lists native `duckdb` as a dependency — npm handles platform-specific binary installation automatically when using `npx`. The bundled launcher (`out/mcp/launcher.mjs`) is a fallback for the Copilot MCP definition provider
- **DuckDB WASM in VS Code webviews** requires special handling: worker scripts are fetched and converted to blob URLs, WASM is pre-fetched in the main thread, and `window.__WEBVIEW_ASSETS_BASE__` resolves asset URLs

## Build & Development

```bash
npm install          # Install all dependencies (root + all packages)
npm run build        # Build everything (webapp, mcp-server, extension)
npm run dev          # Run webapp standalone at localhost for development
```

### Testing in VS Code

Press F5 in VS Code to launch Extension Development Host. Open any `.csv` file to test.

### Publishing

```bash
cd packages/extension
npx @vscode/vsce publish --no-dependencies
```

The extension is published as `MarkSawczuk.sql-csv-chomper` on the VS Code Marketplace.

## Important Files

| File | Purpose |
|------|---------|
| `packages/webapp/src/App.tsx` | Main app component — orchestrates all state (tables, filters, SQL, editing) |
| `packages/webapp/src/services/duckdb.ts` | DuckDB WASM initialization, query execution, all database operations |
| `packages/webapp/src/components/ResultsTable.tsx` | Virtual-scrolled results table with sorting, filtering, cell editing |
| `packages/webapp/src/components/ColumnFilterPanel.tsx` | Rich filter panel (value checkboxes, date histograms, profiling) |
| `packages/webapp/src/components/SqlEditor.tsx` | Monaco-based SQL editor with autocomplete |
| `packages/webapp/src/components/SchemaExplorer.tsx` | Right-side panel showing tables, columns, types, stats |
| `packages/webapp/src/hooks/useDuckDb.ts` | React hook for DuckDB lifecycle (init, load files) |
| `packages/webapp/src/hooks/useQueryExecution.ts` | React hook for running queries with chunked loading |
| `packages/webapp/src/styles/globals.css` | All styles (VS Code theme variables, grid layouts) |
| `packages/extension/src/extension.ts` | Extension activation, commands, bridge server, MCP registration |
| `packages/extension/src/csvEditorProvider.ts` | Custom editor provider — creates webviews, handles file I/O |
| `packages/extension/src/util/getWebviewContent.ts` | Generates webview HTML with CSP, asset URLs, nonce |
| `packages/mcp-server/src/server.ts` | MCP server with all tool definitions |
| `packages/mcp-server/src/duckdb-service.ts` | Native DuckDB wrapper (load, query, edit, save) |
| `packages/mcp-server/src/launcher.mjs` | Auto-installer for native duckdb, entry point for MCP |
| `scripts/build.mjs` | Full build orchestrator |

## Conventions

- **CSS**: Uses VS Code theme CSS variables (`--vscode-editor-background`, etc.) for dark/light theme support
- **State**: Filter state is stored as `Map<string, string>` (column → WHERE clause) plus `Map<string, FilterSelection>` (column → checkbox state)
- **SQL generation**: `defaultQueryForTable()` generates `SELECT rowid, * FROM "table"`, filters are appended via `insertWhereClause()`
- **Column names**: Always double-quoted in generated SQL (`"Column Name"`)
- **Table names**: Always double-quoted in generated SQL (`"table_name"`)
- **Messaging**: Webview ↔ extension host communication uses typed `postMessage` (see `packages/webapp/src/types/messages.ts`)
- **Profile caching**: Column profiling results are cached in-memory per table+column (cleared on edit via `clearProfileCache`)

## Gotchas

- VS Code webviews can't directly use `new Worker(url)` — worker scripts must be fetched and loaded as blob URLs
- VS Code webviews need `wasm-unsafe-eval` in CSP for DuckDB WASM
- Monaco Editor is bundled locally (not CDN) because webview CSP blocks external scripts
- The script tag in the webview HTML must have `type="module"` because Vite outputs ES modules
- `duckdb-async` is bundled into `server.js` by esbuild, but native `duckdb` is external (resolved at runtime from `node_modules`)
- Large git pushes may need `git config http.postBuffer 524288000` due to the ~80MB webview-dist
