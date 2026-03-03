import { useState, useCallback } from 'react';
import { executeQuery } from '../services/duckdb';
import type { QueryResult } from '../types/query';

export function useQueryExecution() {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const runQuery = useCallback(async (sql: string) => {
    setError(null);
    setIsExecuting(true);
    try {
      const r = await executeQuery(sql);
      setResult(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsExecuting(false);
    }
  }, []);

  return { result, error, isExecuting, runQuery };
}
