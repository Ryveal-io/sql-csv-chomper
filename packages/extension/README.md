# SQL CSV Tool

Query and edit CSV files using SQL — right inside VS Code. Powered by [DuckDB](https://duckdb.org/) running entirely in your browser, with no external database required.

<!-- ![SQL CSV Tool Overview](images/overview.png) -->

## The Problem

Working with CSV files in VS Code means either staring at raw text or switching to an external tool. Need to filter 500K rows? Join two CSVs? Edit a value and save? You're stuck copy-pasting into Excel, writing Python scripts, or installing a full database.

## The Solution

SQL CSV Tool turns VS Code into a lightweight SQL IDE for your data files. Open any CSV, write SQL, see results instantly. Edit cells inline, filter columns visually, and save back — all without leaving your editor.

## Features

### SQL Query Editor
Write DuckDB SQL with full autocomplete for table names, column names, keywords, and 60+ built-in functions. Format your SQL with one click or Shift+Alt+F.

<!-- ![SQL Editor with autocomplete](images/sql-editor.png) -->

### Virtual Scrolling for Large Files
Load 500K+ row files without freezing. Data loads in 10,000-row chunks with automatic pagination as you scroll. The status bar shows "10,000 of 500,000 rows" so you always know where you are.

<!-- ![Virtual scrolling with large dataset](images/virtual-scroll.png) -->

### Excel-Style Column Filtering
Click the filter icon on any column header to get a rich filter panel with:
- Value checkboxes with frequency bars
- Search to filter the value list (Select All respects your search)
- Null statistics and distinct count
- Numeric stats (min, max, avg, median)
- Date bucketing (hour/day/week/month/year)

Active filters show as blue chips above the table with one-click removal.

<!-- ![Column filter panel](images/column-filter.png) -->

### Inline Cell Editing
Double-click any cell to edit. Changes save to the in-memory DuckDB database instantly without re-fetching the entire dataset. Click **Save** to write back to disk.

### Column Operations
Right-click any column header to:
- **Rename** the column
- **Insert** a new column left or right
- **Delete** the column

### Find & Replace
Search and replace across any column with case-sensitive and regex options. Live match count shows how many values will change before you commit.

<!-- ![Find and Replace](images/find-replace.png) -->

### Save As with Options
Export your data with custom formatting:
- **Delimiter**: comma, tab, pipe, semicolon, or custom
- **Quoting**: always, as needed, or never
- **Options**: include/exclude header row, add row numbers
- **Extension**: .csv, .tsv, .txt

<!-- ![Save As dialog](images/save-as.png) -->

### Multi-Table Support
Load multiple CSV files and query across them with JOINs. The schema explorer shows all loaded tables with their columns, types, and row counts.

### Sort
Click column headers to sort ascending/descending. A subtle arrow appears on hover so you know columns are sortable. Row numbers update to reflect the sorted order.

## MCP Server for AI Integration

SQL CSV Tool includes a bundled **MCP (Model Context Protocol) server** that lets AI assistants like Claude and GitHub Copilot work with your CSV files.

### GitHub Copilot
The MCP server registers automatically in VS Code 1.99+. Copilot can load files, run queries, edit data, and push SQL into the editor.

### Claude CLI
Use the Command Palette:

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Search for **"SQL CSV Tool: Configure MCP for Claude CLI"**
3. Choose **User** (all projects) or **Project** (this workspace)
4. Done — Claude can now query your CSVs

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

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Run query |
| `Shift+Alt+F` | Format SQL |
| `Ctrl+H` | Toggle Find & Replace |
| `Escape` | Close menus / cancel edit |
| `Ctrl+Click` | Multi-select cells |
| `Right-click cell` | Context menu with filter options |
| `Right-click header` | Column operations (rename, insert, delete) |

## Supported File Types

| Extension | Description |
|-----------|-------------|
| `.csv` | Comma-separated values |
| `.tsv` | Tab-separated values |
| `.tab` | Tab-delimited |
| `.txt` | Text files (auto-detected delimiter) |
| `.jsonl` | JSON Lines |

## How It Works

- **DuckDB WASM** runs entirely in your browser — no server, no external database
- Files are loaded into an in-memory DuckDB instance when you open them
- SQL queries execute against this in-memory database at native speed
- Edits modify the in-memory table; click **Save** to write back to disk
- The MCP server uses a separate DuckDB instance for AI-driven workflows

## Requirements

- VS Code 1.85 or later
- Node.js (for the MCP server only)

## License

[MIT](LICENSE)
