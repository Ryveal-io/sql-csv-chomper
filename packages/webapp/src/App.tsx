import { useState, useCallback, useMemo } from 'react';
import { Layout } from './components/Layout';
import { SqlEditor } from './components/SqlEditor';
import { ResultsTable } from './components/ResultsTable';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { SchemaExplorer } from './components/SchemaExplorer';
import { useDuckDb } from './hooks/useDuckDb';
import { useQueryExecution } from './hooks/useQueryExecution';
import { useVsCodeMessaging } from './hooks/useVsCodeMessaging';
import { exportCsv, describeTable } from './services/duckdb';
import { postMessageToExtension } from './services/vscodeMessenger';
import { pickFile } from './services/standaloneAdapter';
import type { TableInfo } from './types/query';

function defaultQueryForTable(tableName: string): string {
  return `SELECT * FROM "${tableName}" LIMIT 1000`;
}

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
  const [sql, setSql] = useState('');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);

  const { isReady, isLoading: dbLoading, error: dbError, loadFile } = useDuckDb();
  const { result, error: queryError, isExecuting, runQuery } = useQueryExecution();

  const handleLoad = useCallback(async (name: string, content: Uint8Array) => {
    const tableName = await loadFile(name, content);
    const columns = await describeTable(tableName);
    setTables(prev => {
      // Replace if table already exists, otherwise append
      const existing = prev.findIndex(t => t.name === tableName);
      const entry: TableInfo = { name: tableName, fileName: name, columns };
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = entry;
        return next;
      }
      return [...prev, entry];
    });
    setActiveTable(tableName);
    const query = defaultQueryForTable(tableName);
    setSql(query);
    runQuery(query);
  }, [loadFile, runQuery]);

  const handleSelectTable = useCallback((tableName: string) => {
    setActiveTable(tableName);
    const query = defaultQueryForTable(tableName);
    setSql(query);
    runQuery(query);
  }, [runQuery]);

  const handleExport = useCallback(async () => {
    const csvData = await exportCsv(activeTable ?? undefined);
    postMessageToExtension({ type: 'csvData', content: Array.from(csvData) });
  }, [activeTable]);

  const handleSetSql = useCallback((newSql: string) => {
    setSql(newSql);
  }, []);

  const handleRunQuery = useCallback((newSql: string) => {
    setSql(newSql);
    runQuery(newSql);
  }, [runQuery]);

  const { isVsCode } = useVsCodeMessaging({
    onLoad: handleLoad,
    onRequestExport: handleExport,
    onSetSql: handleSetSql,
    onRunQuery: handleRunQuery,
  });

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
      const { name, content } = await pickFile();
      await handleLoad(name, content);
    } catch {
      // User cancelled file picker
    }
  }, [handleLoad]);

  // Build table schemas map for intellisense
  const tableSchemas = useMemo(() => {
    const schemas: Record<string, import('./types/query').QueryColumn[]> = {};
    for (const t of tables) {
      schemas[t.name] = t.columns;
    }
    return schemas;
  }, [tables]);

  // Get active table's columns for result type hints
  const activeColumns = useMemo(() => {
    return tables.find(t => t.name === activeTable)?.columns ?? [];
  }, [tables, activeTable]);

  const error = dbError || queryError;
  const activeFileName = tables.find(t => t.name === activeTable)?.fileName ?? '';

  return (
    <Layout
      toolbar={
        <Toolbar
          onRun={handleRun}
          isLoading={dbLoading || isExecuting}
          fileName={activeFileName}
        />
      }
      sqlEditor={
        <SqlEditor value={sql} onChange={setSql} onRun={handleRun} tableSchemas={tableSchemas} />
      }
      schemaPanel={
        <SchemaExplorer
          tables={tables}
          activeTable={activeTable}
          onSelectTable={handleSelectTable}
          onOpenFile={!isVsCode ? handleOpenFile : undefined}
        />
      }
      resultsTable={
        <ResultsTable
          result={result}
          error={error}
          isLoading={dbLoading && !isReady}
          columnTypes={activeColumns}
          onFilter={handleFilter}
        />
      }
      statusBar={
        <StatusBar result={result} />
      }
    />
  );
}
