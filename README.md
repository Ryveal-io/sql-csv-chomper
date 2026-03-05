# SQL CSV Chomper

A VS Code extension and MCP server for querying and editing CSV/TSV files using SQL, powered by DuckDB.

**[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MarkSawczuk.sql-csv-chomper)**

## Features

- **Custom CSV Editor** — Open delimited files in VS Code with a full SQL IDE layout
- **Full SQL Support** — Write and execute DuckDB SQL against your CSV files
- **Virtual Scrolling** — Handles 500K+ rows with chunked loading
- **Column Filtering** — Excel-style filter panels with value checkboxes, search, date histograms
- **Inline Editing** — Double-click cells to edit, save back to disk
- **Column Operations** — Rename, insert, delete columns via right-click
- **Find & Replace** — Regex and case-sensitive search across columns
- **Save As** — Export with custom delimiter, quoting, row numbers
- **Multi-Table Support** — Load multiple files and JOIN across them
- **MCP Server** — Expose CSV querying to Claude, Copilot, and other AI assistants

## Project Structure

```
packages/
  extension/     # VS Code extension (custom editor provider)
  webapp/        # React editor UI (Monaco, TanStack Table, DuckDB WASM)
  mcp-server/    # MCP server for LLM integration (native DuckDB)
```

## Development

```bash
npm install
npm run build        # Build all packages
npm run dev          # Run webapp standalone for development
```

Press **F5** in VS Code to launch the Extension Development Host for testing.

## Publishing

```bash
cd packages/extension
npx @vscode/vsce publish --no-dependencies
```

## MCP Server

The MCP server lets AI assistants load, query, edit, and save CSV files via SQL. It auto-installs the native DuckDB binary on first run.

See the [extension README](packages/extension/README.md) for full setup instructions (Claude Code, Copilot, terminal).

### Quick setup (Claude Code)

```bash
claude mcp add sql-csv-chomper --scope user -- npx -y sql-csv-chomper-mcp
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `load_csv` | Load a CSV/TSV file as a named table |
| `execute_sql` | Run SQL queries against loaded tables |
| `list_tables` / `list_columns` / `get_schema` | Inspect loaded data |
| `update_rows` / `insert_row` / `delete_rows` | Edit data |
| `save_table` | Export a table back to CSV |
| `set_editor_sql` / `run_editor_query` | Push SQL into the VS Code editor |

## License

[MIT](LICENSE)
