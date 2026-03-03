import { Database } from 'duckdb-async';
import path from 'path';

interface QueryColumn {
  name: string;
  type: string;
}

interface QueryResult {
  columns: QueryColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

interface TableInfo {
  name: string;
  columns: QueryColumn[];
  rowCount: number;
}

let db: Database | null = null;

function tableNameFromPath(filePath: string): string {
  const base = path.basename(filePath);
  // Remove extension and sanitize
  const stem = base.replace(/\.[^.]+$/, '');
  return stem.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1') || 'data';
}

export async function init(): Promise<void> {
  if (!db) {
    db = await Database.create(':memory:');
  }
}

function getDb(): Database {
  if (!db) throw new Error('DuckDB not initialized. Call init() first.');
  return db;
}

export async function loadCsv(filePath: string, tableName?: string): Promise<string> {
  const d = getDb();
  const name = tableName || tableNameFromPath(filePath);
  const absPath = path.resolve(filePath);

  await d.exec(`
    CREATE OR REPLACE TABLE "${name}" AS
    SELECT * FROM read_csv_auto('${absPath.replace(/'/g, "''")}')
  `);

  return name;
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  const d = getDb();

  // Get column metadata via DESCRIBE
  let columns: QueryColumn[] = [];
  try {
    const desc = await d.all(`DESCRIBE ${sql}`);
    columns = desc.map((row: any) => ({
      name: String(row.column_name),
      type: String(row.column_type),
    }));
  } catch {
    // DESCRIBE may fail for non-SELECT statements, that's OK
  }

  // Run the actual query
  const rows = await d.all(sql);

  // If DESCRIBE failed but we have rows, infer column names
  if (columns.length === 0 && rows.length > 0) {
    columns = Object.keys(rows[0]).map(name => ({ name, type: 'VARCHAR' }));
  }

  return { columns, rows, rowCount: rows.length };
}

export async function getTableColumns(tableName: string): Promise<{ columns: QueryColumn[]; rowCount: number }> {
  const d = getDb();

  const colRows = await d.all(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${tableName.replace(/'/g, "''")}' AND table_schema = 'main' ORDER BY ordinal_position`
  );

  const columns: QueryColumn[] = colRows.map((r: any) => ({
    name: String(r.column_name),
    type: String(r.data_type),
  }));

  const countRows = await d.all(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
  const rowCount = Number((countRows[0] as any)?.cnt ?? 0);

  return { columns, rowCount };
}

export async function getSchema(): Promise<TableInfo[]> {
  const tableNames = await listTables();
  const tables: TableInfo[] = [];
  for (const tableName of tableNames) {
    const { columns, rowCount } = await getTableColumns(tableName);
    tables.push({ name: tableName, columns, rowCount });
  }
  return tables;
}

export async function listTables(): Promise<string[]> {
  const d = getDb();
  const rows = await d.all(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE'"
  );
  return rows.map((r: any) => String(r.table_name));
}

export async function updateRows(
  table: string,
  setClauses: Record<string, unknown>,
  whereClause: string
): Promise<number> {
  const d = getDb();

  const setEntries = Object.entries(setClauses)
    .map(([col, val]) => {
      const sqlVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` :
                     val === null ? 'NULL' : String(val);
      return `"${col}" = ${sqlVal}`;
    })
    .join(', ');

  const sql = `UPDATE "${table}" SET ${setEntries} WHERE ${whereClause}`;
  const result = await d.all(sql);
  // DuckDB UPDATE returns [{Count: N}]
  return Number((result[0] as any)?.Count ?? (result[0] as any)?.count ?? 0);
}

export async function insertRow(
  table: string,
  values: Record<string, unknown>
): Promise<void> {
  const d = getDb();

  const cols = Object.keys(values).map(c => `"${c}"`).join(', ');
  const vals = Object.values(values)
    .map(val => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      return String(val);
    })
    .join(', ');

  await d.exec(`INSERT INTO "${table}" (${cols}) VALUES (${vals})`);
}

export async function deleteRows(table: string, whereClause: string): Promise<number> {
  const d = getDb();
  const result = await d.all(`DELETE FROM "${table}" WHERE ${whereClause}`);
  // DuckDB DELETE returns [{Count: N}]
  return Number((result[0] as any)?.Count ?? (result[0] as any)?.count ?? 0);
}

export async function saveTable(table: string, filePath: string): Promise<void> {
  const d = getDb();
  const absPath = path.resolve(filePath);
  await d.exec(`COPY "${table}" TO '${absPath.replace(/'/g, "''")}' (FORMAT CSV, HEADER)`);
}

export async function close(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
