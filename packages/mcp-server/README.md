# SQL CSV Chomper — MCP Server

Give your AI assistant direct SQL access to CSV files. Load, query, edit, and save — no scripts, no round-trips.

Powered by [DuckDB](https://duckdb.org/). Works with [Claude Code](https://docs.anthropic.com/en/docs/claude-code), GitHub Copilot, and any [MCP](https://modelcontextprotocol.io/)-compatible client.

> **Want the full visual experience?** Install the [SQL CSV Chomper VS Code extension](https://marketplace.visualstudio.com/items?itemName=MarkSawczuk.sql-csv-chomper) for a built-in SQL editor with column filtering, inline editing, virtual scrolling, and more.

## Quick start

### Claude Code

```bash
claude mcp add sql-csv-chomper --scope user -- npx -y sql-csv-chomper-mcp
```

That's it. Claude can now load and query your CSV files directly.

### Claude Code (from VS Code)

1. Install the [SQL CSV Chomper extension](https://marketplace.visualstudio.com/items?itemName=MarkSawczuk.sql-csv-chomper)
2. `Cmd+Shift+P` → **"SQL CSV Chomper: Configure MCP for Claude CLI"**
3. Choose **User** (all projects) or **Project** (this workspace)

### Other MCP clients

Run the server over stdio:

```bash
npx -y sql-csv-chomper-mcp
```

The server communicates via the [Model Context Protocol](https://modelcontextprotocol.io/) over stdin/stdout.

## Available tools

| Tool | Description |
|------|-------------|
| `load_csv` | Load a CSV/TSV file as a named table |
| `execute_sql` | Run any DuckDB SQL query |
| `list_tables` | List all loaded tables |
| `list_columns` | Get column names and types for a table |
| `get_schema` | Full schema for all tables |
| `update_rows` | Update rows matching a WHERE condition |
| `insert_row` | Insert a new row |
| `delete_rows` | Delete rows matching a WHERE condition |
| `save_table` | Export a table to CSV |
| `set_editor_sql` | Push SQL into the VS Code editor (requires extension) |
| `run_editor_query` | Set and execute SQL in the VS Code editor (requires extension) |

## What can your AI do with this?

- **"Load sales.csv and show me the top 10 customers by revenue"**
- **"Join orders.csv with products.csv and find items with no orders"**
- **"Update all rows where status is 'pending' to 'active'"**
- **"Save the filtered results to cleaned_data.csv"**
- **"Show me a summary of null values across all columns"**

DuckDB's full SQL is available — joins, window functions, CTEs, aggregations, regex, date math, and more.

## How it works

- `npx` downloads the package and installs DuckDB's native binary for your platform automatically
- The server starts over stdio and speaks MCP
- Files are loaded into an in-memory DuckDB instance
- All queries run locally — nothing leaves your machine

## Upgrading

```bash
claude mcp remove sql-csv-chomper
claude mcp add sql-csv-chomper --scope user -- npx -y sql-csv-chomper-mcp
```

## Requirements

- Node.js 18+

## Related

- [SQL CSV Chomper VS Code extension](https://marketplace.visualstudio.com/items?itemName=MarkSawczuk.sql-csv-chomper) — Visual SQL editor for CSV files with column filtering, inline editing, and virtual scrolling
- [GitHub repo](https://github.com/Ryveal-io/sql-csv-chomper)

## License

[MIT](https://github.com/Ryveal-io/sql-csv-chomper/blob/main/LICENSE)
