# sql-csv-tool

A VS Code extension and MCP server for querying and editing CSV/TSV files using SQL, powered by DuckDB.

## Features

- **Custom CSV Editor** — Open delimited files directly in VS Code with a SQL IDE-style layout (query editor, schema browser, results pane)
- **Full SQL Support** — Write and execute DuckDB SQL against your CSV files
- **Inline Editing** — Edit cells directly in the results pane and save changes back to the file
- **MCP Server** — Expose CSV querying capabilities to LLMs like Claude and GitHub Copilot

## Project Structure

```
packages/
  extension/    # VS Code extension
  webapp/       # React-based editor UI
  mcp-server/   # MCP server for LLM integration
```

## Building

```bash
npm install
npm run build        # build all packages
npm run build:mcp    # build MCP server only
npm run dev          # run webapp in dev mode
```

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
