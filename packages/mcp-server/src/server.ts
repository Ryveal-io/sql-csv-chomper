import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as db from './duckdb-service.js';
import * as bridge from './bridge-client.js';

const INSTRUCTIONS = `
This server provides SQL access to CSV/TSV data files via DuckDB.

## DuckDB SQL Highlights
- FROM-first syntax: \`FROM my_table SELECT col1, col2\` (SELECT is optional)
- GROUP BY ALL: automatically groups by all non-aggregate columns
- ORDER BY ALL: orders by all columns
- SELECT * EXCLUDE (col1, col2): select all columns except specified ones
- SELECT * REPLACE (expr AS col): select all but replace a column's expression
- COLUMNS('regex'): select columns matching a pattern, e.g. \`SELECT COLUMNS('.*_id') FROM t\`
- QUALIFY: filter window function results — \`SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn FROM employees QUALIFY rn = 1\`
- ILIKE for case-insensitive matching, regexp_matches() for regex
- Complex types: LIST, STRUCT, MAP are first-class — use dot notation for struct fields
- SUMMARIZE: quick stats — \`SUMMARIZE SELECT * FROM table\`
- DESCRIBE: show column types — \`DESCRIBE table\` or \`DESCRIBE SELECT ...\`
- Friendly SQL: \`SELECT * FROM 'file.csv'\` reads files directly without loading

## Row-based Editing
To edit specific rows safely:
1. Find rows: \`SELECT rowid, * FROM "table" WHERE condition\`
2. Update: use update_rows tool with \`where: "rowid = N"\`
3. Delete: use delete_rows tool with \`where: "rowid = N"\`
4. Insert: use insert_row tool with column-value pairs
Always SELECT with rowid first to identify exact rows before modifying.

## Multi-file Querying
- load_csv creates a named table from each file (e.g., employees.csv becomes "employees")
- Query across tables: \`SELECT * FROM "employees" e JOIN "departments" d ON e.dept_id = d.id\`
- Glob patterns work directly: \`SELECT * FROM read_csv_auto('data/*.csv')\`
- No need to load files for glob/direct reads — DuckDB handles them on the fly
- UNION across files: \`SELECT * FROM read_csv_auto('logs_2024_*.csv')\`

## Editor Bridge (VS Code only)
- set_editor_sql: pushes SQL into the VS Code editor pane (visual)
- run_editor_query: sets SQL AND executes it, showing results in the editor
- These only work when connected to VS Code — use execute_sql for direct results
- Prefer execute_sql for data retrieval, run_editor_query for showing results to the user
`.trim();

const server = new McpServer(
  { name: 'sql-csv-tool', version: '0.1.0' },
  { instructions: INSTRUCTIONS }
);

// --- Data Tools ---

server.tool(
  'load_csv',
  'Load a CSV/TSV/delimited file from disk into DuckDB as a named table. The table name defaults to the filename (e.g., employees.csv becomes "employees"). Use this before running queries.',
  {
    filePath: z.string().describe('Absolute or relative path to the CSV/TSV file'),
    tableName: z.string().optional().describe('Optional table name (defaults to filename stem)'),
  },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  async ({ filePath, tableName }) => {
    try {
      const name = await db.loadCsv(filePath, tableName);
      const { columns, rowCount } = await db.getTableColumns(name);
      const colList = columns.map(c => `  ${c.name} (${c.type})`).join('\n');
      return {
        content: [{
          type: 'text',
          text: `Loaded "${filePath}" as table "${name}" (${rowCount} rows)\n\nColumns:\n${colList}\n\nYou can now query it with: SELECT * FROM "${name}" LIMIT 10`,
        }],
      };
    } catch (err: unknown) {
      return { content: [{ type: 'text', text: `Error loading CSV: ${err instanceof Error ? err.message : err}` }], isError: true };
    }
  }
);

server.tool(
  'execute_sql',
  'Execute a SQL query against loaded tables in DuckDB. Returns column names, types, and row data. Use load_csv first to load files. Supports full DuckDB SQL syntax including joins, aggregations, window functions, etc.',
  {
    sql: z.string().describe('The SQL query to execute'),
  },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async ({ sql }) => {
    try {
      const result = await db.executeQuery(sql);
      const header = result.columns.map(c => c.name).join(' | ');
      const types = result.columns.map(c => c.type).join(' | ');
      const separator = result.columns.map(c => '-'.repeat(Math.max(c.name.length, c.type.length))).join('-+-');

      let tableStr = `${header}\n${types}\n${separator}\n`;

      const MAX_DISPLAY_ROWS = 1000;
      const displayRows = result.rows.slice(0, MAX_DISPLAY_ROWS);
      for (const row of displayRows) {
        const vals = result.columns.map(c => {
          const v = row[c.name];
          return v === null || v === undefined ? 'NULL' : String(v);
        });
        tableStr += vals.join(' | ') + '\n';
      }

      if (result.rowCount > MAX_DISPLAY_ROWS) {
        tableStr += `\n[Showing ${MAX_DISPLAY_ROWS} of ${result.rowCount} total rows. Add LIMIT or narrow your WHERE clause to see specific rows.]`;
      } else {
        tableStr += `\n${result.rowCount} row(s)`;
      }

      return { content: [{ type: 'text', text: tableStr }] };
    } catch (err: unknown) {
      return { content: [{ type: 'text', text: `SQL Error: ${err instanceof Error ? err.message : err}` }], isError: true };
    }
  }
);

server.tool(
  'get_schema',
  'Get the schema of all loaded tables including column names, types, and row counts.',
  { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async () => {
    try {
      const schema = await db.getSchema();
      if (schema.length === 0) {
        return { content: [{ type: 'text', text: 'No tables loaded. Use load_csv to load a file first.' }] };
      }
      let text = '';
      for (const table of schema) {
        text += `Table: ${table.name} (${table.rowCount} rows)\n`;
        for (const col of table.columns) {
          text += `  ${col.name}: ${col.type}\n`;
        }
        text += '\n';
      }
      return { content: [{ type: 'text', text: text.trim() }] };
    } catch (err: unknown) {
      return { content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : err}` }], isError: true };
    }
  }
);

server.tool(
  'list_tables',
  'List all tables currently loaded in DuckDB.',
  { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async () => {
    try {
      const tables = await db.listTables();
      if (tables.length === 0) {
        return { content: [{ type: 'text', text: 'No tables loaded. Use load_csv to load a file first.' }] };
      }
      return { content: [{ type: 'text', text: `Loaded tables:\n${tables.map(t => `  - ${t}`).join('\n')}` }] };
    } catch (err: unknown) {
      return { content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : err}` }], isError: true };
    }
  }
);

server.tool(
  'list_columns',
  'Get column names, types, and row count for a specific table.',
  {
    table: z.string().describe('Table name to describe'),
  },
  { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async ({ table }) => {
    try {
      const { columns, rowCount } = await db.getTableColumns(table);
      let text = `Table: ${table} (${rowCount} rows)\n`;
      for (const col of columns) {
        text += `  ${col.name}: ${col.type}\n`;
      }
      return { content: [{ type: 'text', text: text.trim() }] };
    } catch (err: unknown) {
      return { content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : err}` }], isError: true };
    }
  }
);

// --- Modification Tools ---

server.tool(
  'update_rows',
  'Update rows in a table matching a WHERE condition. Use "SELECT rowid, * FROM table" to find specific row IDs, then update with "rowid = X". Example: update_rows(table: "employees", set: {"salary": 100000}, where: "rowid = 5")',
  {
    table: z.string().describe('Table name'),
    set: z.record(z.unknown()).describe('Column-value pairs to update, e.g. {"salary": 100000, "department": "Engineering"}'),
    where: z.string().describe('WHERE clause to identify rows, e.g. "rowid = 5" or "department = \'Sales\'"'),
  },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  async ({ table, set, where }) => {
    try {
      const changed = await db.updateRows(table, set, where);
      return { content: [{ type: 'text', text: `Updated ${changed} row(s) in "${table}".` }] };
    } catch (err: unknown) {
      return { content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : err}` }], isError: true };
    }
  }
);

server.tool(
  'insert_row',
  'Insert a new row into a table.',
  {
    table: z.string().describe('Table name'),
    values: z.record(z.unknown()).describe('Column-value pairs for the new row, e.g. {"name": "Alice", "age": 30}'),
  },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  async ({ table, values }) => {
    try {
      await db.insertRow(table, values);
      return { content: [{ type: 'text', text: `Inserted 1 row into "${table}".` }] };
    } catch (err: unknown) {
      return { content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : err}` }], isError: true };
    }
  }
);

server.tool(
  'delete_rows',
  'Delete rows from a table matching a WHERE condition. Use "SELECT rowid, * FROM table" to find specific row IDs first.',
  {
    table: z.string().describe('Table name'),
    where: z.string().describe('WHERE clause, e.g. "rowid = 5" or "status = \'inactive\'"'),
  },
  { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  async ({ table, where }) => {
    try {
      const changed = await db.deleteRows(table, where);
      return { content: [{ type: 'text', text: `Deleted ${changed} row(s) from "${table}".` }] };
    } catch (err: unknown) {
      return { content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : err}` }], isError: true };
    }
  }
);

server.tool(
  'save_table',
  'Export a table to a CSV file on disk. This writes the current state of the in-memory table to the specified file path.',
  {
    table: z.string().describe('Table name to export'),
    filePath: z.string().describe('File path to write the CSV to'),
  },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  async ({ table, filePath }) => {
    try {
      await db.saveTable(table, filePath);
      return { content: [{ type: 'text', text: `Saved table "${table}" to "${filePath}".` }] };
    } catch (err: unknown) {
      return { content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : err}` }], isError: true };
    }
  }
);

// --- Editor Bridge Tools ---

server.tool(
  'set_editor_sql',
  'Set the SQL text in the VS Code SQL editor. Only works when connected to a VS Code extension instance.',
  {
    sql: z.string().describe('SQL text to set in the editor'),
  },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async ({ sql }) => {
    const result = await bridge.setSql(sql);
    if (result.success) {
      return { content: [{ type: 'text', text: `SQL set in editor:\n${sql}` }] };
    }
    return { content: [{ type: 'text', text: result.message || 'Failed to set SQL in editor.' }] };
  }
);

server.tool(
  'run_editor_query',
  'Set the SQL text in the VS Code SQL editor AND execute it, showing results in the results pane. Only works when connected to a VS Code extension instance.',
  {
    sql: z.string().describe('SQL text to set and run in the editor'),
  },
  { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async ({ sql }) => {
    const result = await bridge.runQuery(sql);
    if (result.success) {
      return { content: [{ type: 'text', text: `Query set and executed in editor:\n${sql}` }] };
    }
    return { content: [{ type: 'text', text: result.message || 'Failed to run query in editor.' }] };
  }
);

// --- Start server ---

async function main() {
  await db.init();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is reserved for MCP protocol)
  console.error('SQL CSV Tool MCP server started');
  if (bridge.isConnected()) {
    console.error(`VS Code bridge connected on port ${process.env.VSCODE_BRIDGE_PORT}`);
  } else {
    console.error('Running standalone (no VS Code bridge)');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
