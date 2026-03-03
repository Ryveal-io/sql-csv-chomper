# Changelog

## 0.1.0 - 2026-03-03

Initial release.

### Features
- **Custom CSV Editor** for VS Code — opens `.csv`, `.tsv`, `.tab`, `.jsonl`, `.txt` files with a SQL IDE layout
- **DuckDB WASM** SQL engine running entirely in-browser
- **Monaco SQL editor** with autocomplete for tables, columns, keywords, and DuckDB functions
- **Virtual scrolling** with automatic chunked loading (10K row chunks) for large files (500K+ rows)
- **Inline cell editing** — double-click to edit, saves to DuckDB, local state update (no re-fetch)
- **Column filtering** — Excel-style filter panel with value checkboxes, search, null stats, numeric/date profiling
- **Column operations** — right-click headers to rename, insert, or delete columns
- **Find & Replace** — search and replace across columns with regex and case-sensitive options
- **Sort** — click column headers to sort; hover shows sort indicator
- **Save / Save As** — save back to original file or export with custom delimiter, quoting, row numbers, and file extension
- **SQL formatting** — Format button and Shift+Alt+F shortcut
- **Multi-table support** — load multiple files and query across them with JOINs
- **Schema explorer** — sidebar showing loaded tables, columns, types, and row counts
- **MCP server** — bundled MCP server for Claude CLI and GitHub Copilot integration
- **"Configure MCP for Claude CLI"** command in the Command Palette
