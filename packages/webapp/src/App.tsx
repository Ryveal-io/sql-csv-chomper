import { useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { SqlEditor } from './components/SqlEditor';
import { ResultsTable } from './components/ResultsTable';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { SchemaPanel } from './components/SchemaPanel';
import { useDuckDb } from './hooks/useDuckDb';
import { useQueryExecution } from './hooks/useQueryExecution';
import { useVsCodeMessaging } from './hooks/useVsCodeMessaging';
import { exportCsv, executeQuery as execQuery } from './services/duckdb';
import { postMessageToExtension } from './services/vscodeMessenger';
import { loadFileFromPicker } from './services/standaloneAdapter';
import type { QueryColumn } from './types/query';

const DEFAULT_QUERY = 'SELECT * FROM data LIMIT 1000';

function insertWhereClause(sql: string, clause: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/, '');

  // Check if WHERE already exists (case-insensitive)
  const whereMatch = trimmed.match(/\bWHERE\b/i);
  if (whereMatch) {
    // Find where the WHERE conditions end (before GROUP BY, ORDER BY, LIMIT, HAVING, UNION, etc.)
    const afterWhere = trimmed.slice(whereMatch.index! + whereMatch[0].length);
    const endPattern = /\b(GROUP\s+BY|ORDER\s+BY|LIMIT|HAVING|UNION|EXCEPT|INTERSECT)\b/i;
    const endMatch = afterWhere.match(endPattern);

    if (endMatch) {
      const insertPos = whereMatch.index! + whereMatch[0].length + endMatch.index!;
      return trimmed.slice(0, insertPos).trimEnd() + ' AND ' + clause + ' ' + trimmed.slice(insertPos);
    }
    // No trailing clause — append at end
    return trimmed + ' AND ' + clause;
  }

  // No WHERE clause — need to insert one
  // Find the right insertion point (before GROUP BY, ORDER BY, LIMIT, HAVING, etc.)
  const insertPattern = /\b(GROUP\s+BY|ORDER\s+BY|LIMIT|HAVING|UNION|EXCEPT|INTERSECT)\b/i;
  const insertMatch = trimmed.match(insertPattern);

  if (insertMatch) {
    const pos = insertMatch.index!;
    return trimmed.slice(0, pos).trimEnd() + ' WHERE ' + clause + ' ' + trimmed.slice(pos);
  }

  // No trailing clauses — append WHERE at end
  return trimmed + ' WHERE ' + clause;
}

export default function App() {
  const [sql, setSql] = useState(DEFAULT_QUERY);
  const [fileName, setFileName] = useState('');
  const [tableColumns, setTableColumns] = useState<QueryColumn[]>([]);

  const { isReady, isLoading: dbLoading, error: dbError, loadFile } = useDuckDb();
  const { result, error: queryError, isExecuting, runQuery } = useQueryExecution();

  const handleLoad = useCallback(async (name: string, content: Uint8Array) => {
    await loadFile(name, content);
    setFileName(name);
    const r = await runQueryAndGetSchema(DEFAULT_QUERY);
    if (r) setTableColumns(r);
  }, [loadFile]);

  const handleExport = useCallback(async () => {
    const csvData = await exportCsv();
    postMessageToExtension({ type: 'csvData', content: Array.from(csvData) });
  }, []);

  const { isVsCode } = useVsCodeMessaging({
    onLoad: handleLoad,
    onRequestExport: handleExport,
  });

  const runQueryAndGetSchema = useCallback(async (query: string) => {
    await runQuery(query);
    // After initial load, get the schema
    try {
      const schemaResult = await execQuery("SELECT column_name, column_type FROM (DESCRIBE data)");
      return schemaResult.rows.map(row => ({
        name: String(row.column_name),
        type: String(row.column_type),
      }));
    } catch {
      return null;
    }
  }, [runQuery]);

  const handleRun = useCallback(() => {
    runQuery(sql);
  }, [sql, runQuery]);

  const handleFilter = useCallback((clause: string) => {
    setSql((prev) => {
      const newSql = insertWhereClause(prev, clause);
      // Auto-run with the new SQL after state updates
      setTimeout(() => runQuery(newSql), 0);
      return newSql;
    });
  }, [runQuery]);

  const handleOpenFile = useCallback(async () => {
    try {
      const name = await loadFileFromPicker();
      setFileName(name);
      const cols = await runQueryAndGetSchema(DEFAULT_QUERY);
      if (cols) setTableColumns(cols);
    } catch {
      // User cancelled file picker
    }
  }, [runQueryAndGetSchema]);

  const error = dbError || queryError;

  return (
    <Layout
      toolbar={
        <Toolbar
          onRun={handleRun}
          onOpenFile={!isVsCode ? handleOpenFile : undefined}
          isLoading={dbLoading || isExecuting}
          fileName={fileName}
        />
      }
      sqlEditor={
        <SqlEditor value={sql} onChange={setSql} onRun={handleRun} schema={tableColumns} />
      }
      schemaPanel={
        <SchemaPanel columns={tableColumns} tableName={fileName || 'data'} />
      }
      resultsTable={
        <ResultsTable
          result={result}
          error={error}
          isLoading={dbLoading && !isReady}
          columnTypes={tableColumns}
          onFilter={handleFilter}
        />
      }
      statusBar={
        <StatusBar result={result} />
      }
    />
  );
}
