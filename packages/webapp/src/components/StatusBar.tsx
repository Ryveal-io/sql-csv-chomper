import type { QueryResult } from '../types/query';

interface StatusBarProps {
  result: QueryResult | null;
}

export function StatusBar({ result }: StatusBarProps) {
  return (
    <div className="status-bar">
      {result && (
        <>
          <span className="status-item">
            {result.rowCount} row{result.rowCount !== 1 ? 's' : ''}
          </span>
          <span className="status-item">
            {result.queryTimeMs.toFixed(1)}ms
          </span>
          <span className="status-item">
            {result.columns.length} column{result.columns.length !== 1 ? 's' : ''}
          </span>
        </>
      )}
    </div>
  );
}
