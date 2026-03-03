# sql-csv-tool

A VS Code extension and MCP server for querying and editing CSV/TSV files using SQL, powered by DuckDB.

## Features

- **Custom CSV Editor** — Open delimited files directly in VS Code with a SQL IDE-style layout (query editor, schema browser, results pane)
- **Full SQL Support** — Write and execute DuckDB SQL against your CSV files
- **Inline Editing** — Double-click cells to edit values directly in the results pane
- **Virtual Scrolling** — Handles large files (500K+ rows) smoothly with automatic chunked loading
- **Column Filtering** — Excel-style filter panel with value checkboxes, search, null stats, and numeric/date profiling
- **Column Operations** — Right-click column headers to rename, insert, or delete columns
- **Find & Replace** — Search and replace across columns with regex and case-sensitive options
- **Sort** — Click column headers to sort; hover shows sort indicator
- **Save As** — Export with custom delimiter, quoting, row numbers, and file extension
- **SQL Formatting** — Format button and Shift+Alt+F to clean up SQL with proper line breaks
- **Multi-Table Support** — Load multiple CSV files and query across them with JOINs
- **MCP Server** — Expose CSV querying capabilities to LLMs like Claude and GitHub Copilot

## Project Structure

```
packages/
  extension/    # VS Code extension (custom editor provider)
  webapp/       # React-based editor UI (Monaco, TanStack Table, DuckDB WASM)
  mcp-server/   # MCP server for LLM integration
```

## Building

```bash
npm install
npm run build        # build all packages
npm run build:mcp    # build MCP server only
npm run dev          # run webapp in dev mode
```

## Installing as a VS Code Extension

```bash
npm install
npm run build
cd packages/extension
npx @vscode/vsce package
```

This produces a `.vsix` file. Install it in VS Code:

```bash
code --install-extension sql-csv-tool-*.vsix
```

Or from VS Code: Extensions > `...` menu > "Install from VSIX..."

Once installed, opening any `.csv` or `.tsv` file will use the SQL editor instead of the default text editor.

## Standalone Web App

For quick use without VS Code:

```bash
npm run dev
```

Open the URL shown in the terminal. Drag and drop CSV files or use the "Open File" button.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Run query |
| Shift+Alt+F | Format SQL |
| Ctrl+H | Toggle Find & Replace |
| Escape | Close menus / cancel edit |

## MCP Server Setup

The MCP server lets LLMs load, query, edit, and save CSV/TSV files using SQL via DuckDB.

### Claude Code (CLI)

**Option A: CLI command**

```bash
claude mcp add sql-csv-tool -- node /absolute/path/to/sql-csv-tool/packages/mcp-server/out/server.js
```

Use `--scope project` to share with your team (writes to `.mcp.json`), or `--scope user` to make it available across all your projects.

**Option B: Project config file (`.mcp.json`)**

Create a `.mcp.json` file in your project root:

```json
{
  "mcpServers": {
    "sql-csv-tool": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/sql-csv-tool/packages/mcp-server/out/server.js"]
    }
  }
}
```

### GitHub Copilot (VS Code)

Create or edit `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "sql-csv-tool": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/sql-csv-tool/packages/mcp-server/out/server.js"]
    }
  }
}
```

Or add it via the command line:

```bash
code --add-mcp '{"name":"sql-csv-tool","command":"node","args":["/absolute/path/to/sql-csv-tool/packages/mcp-server/out/server.js"]}'
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `load_csv` | Load a CSV/TSV file as a named table |
| `execute_sql` | Run SQL queries against loaded tables |
| `list_tables` | List all loaded tables |
| `list_columns` | Get column names and types for a table |
| `get_schema` | Get schema for all loaded tables |
| `update_rows` | Update rows matching a WHERE condition |
| `insert_row` | Insert a new row |
| `delete_rows` | Delete rows matching a WHERE condition |
| `save_table` | Export a table back to a CSV file |
| `set_editor_sql` | Push SQL into the VS Code editor pane |
| `run_editor_query` | Set and execute SQL in the VS Code editor |

## Motivation

The existing DuckDB extension for VS Code doesn't let you edit and run SQL freely, and lacks MCP support for LLM-driven CSV workflows. This project fills that gap — providing a proper SQL IDE experience for CSV files and an MCP server for AI-assisted data work.
