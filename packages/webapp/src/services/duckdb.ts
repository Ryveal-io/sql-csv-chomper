import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import type { QueryColumn, QueryResult } from '../types/query';

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

// Track loaded tables: tableName -> originalFileName
const loadedTables = new Map<string, string>();

function tableNameFromFileName(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, '');
  return stem.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1') || 'data';
}

export async function initDuckDb(): Promise<void> {
  if (db) return;

  const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: { mainModule: duckdb_wasm, mainWorker: mvp_worker },
    eh: { mainModule: duckdb_wasm_eh, mainWorker: eh_worker },
  };

  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  conn = await db.connect();
}

export async function loadCsvFromBytes(
  fileName: string,
  content: Uint8Array
): Promise<string> {
  if (!db || !conn) throw new Error('DuckDB not initialized');

  const tableName = tableNameFromFileName(fileName);
  await db.registerFileBuffer(fileName, content);
  await conn.query(`
    CREATE OR REPLACE TABLE "${tableName}" AS
    SELECT * FROM read_csv_auto('${fileName}')
  `);

  loadedTables.set(tableName, fileName);
  return tableName;
}

export async function describeTable(tableName: string): Promise<QueryColumn[]> {
  if (!conn) throw new Error('DuckDB not connected');
  const result = await conn.query(
    `SELECT column_name, column_type FROM (DESCRIBE "${tableName}")`
  );
  const columns: QueryColumn[] = [];
  for (let i = 0; i < result.numRows; i++) {
    columns.push({
      name: String(result.getChild('column_name')?.get(i)),
      type: String(result.getChild('column_type')?.get(i)),
    });
  }
  return columns;
}

export function getLoadedTables(): Map<string, string> {
  return new Map(loadedTables);
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  if (!conn) throw new Error('DuckDB not connected');

  const start = performance.now();
  const result = await conn.query(sql);
  const queryTimeMs = performance.now() - start;

  const columns = result.schema.fields.map((f) => ({
    name: f.name,
    type: f.type.toString(),
  }));

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < result.numRows; i++) {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      row[col.name] = result.getChild(col.name)?.get(i);
    }
    rows.push(row);
  }

  return { columns, rows, rowCount: result.numRows, queryTimeMs };
}

export async function exportCsv(tableName?: string): Promise<Uint8Array> {
  if (!conn || !db) throw new Error('DuckDB not connected');
  const table = tableName || (loadedTables.keys().next().value ?? 'data');
  await conn.query(`COPY "${table}" TO 'export.csv' (FORMAT CSV, HEADER)`);
  const buffer = await db.copyFileToBuffer('export.csv');
  return buffer;
}

export function getConnection(): duckdb.AsyncDuckDBConnection | null {
  return conn;
}
